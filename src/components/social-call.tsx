import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { callErrorMessage, createSignalQueue } from "@/lib/call-signaling";

// Peer-to-peer audio/video calls. Signaling goes over realtime broadcast channels,
// one receiver per user; media uses STUN with an external TURN fallback.
type Signal =
  | { type: "offer"; callId: string; from: string; name: string; video: boolean; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; callId: string; candidate: RTCIceCandidateInit }
  | { type: "end"; callId: string };

type CallState = {
  callId: string;
  peerId: string;
  peerName: string;
  video: boolean;
  status: "calling" | "ringing" | "connecting" | "connected";
  incomingSdp?: RTCSessionDescriptionInit;
};

// STUN + TURN relay: sem relay, chamadas entre redes móveis (4G/5G) costumam não conectar.
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" },
  ],
  iceCandidatePoolSize: 4,
};

// REST broadcast sends to a receiver without joining/removing its listening channel.
async function sendTo(userId: string, payload: Signal) {
  const ch = supabase.channel(`social-call:${userId}`);
  const result = await ch.send({ type: "broadcast", event: "signal", payload }, { timeout: 8_000 });
  if (result !== "ok") throw new Error("Falha ao enviar sinal da chamada");
}

export function useSocialCalls(userId: string, myName: string) {
  const [call, setCall] = useState<CallState | null>(null);
  const callRef = useRef<CallState | null>(null);
  function updateCall(next: CallState | null) { callRef.current = next; setCall(next); }
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const outgoingIce = useRef<RTCIceCandidateInit[]>([]);
  const sdpSent = useRef(false);
  const sendQueue = useRef(createSignalQueue());
  const readyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function sendSignal(peerId: string, signal: Signal) {
    return sendQueue.current(() => sendTo(peerId, signal));
  }
  async function flushIce(peerId: string, callId: string) {
    sdpSent.current = true;
    const candidates = outgoingIce.current.splice(0);
    for (const candidate of candidates) await sendSignal(peerId, { type: "ice", callId, candidate });
  }

  function cleanup() {
    updateCall(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const pc = pcRef.current;
    if (pc) { pc.ontrack = null; pc.onicecandidate = null; pc.onconnectionstatechange = null; }
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    outgoingIce.current = [];
    sdpSent.current = false;
    sendQueue.current = createSignalQueue();
    setLocal(null);
    setRemote(null);
  }

  async function makePeer(peerId: string, callId: string, video: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } : false,
    });
    if (callRef.current?.callId !== callId) { stream.getTracks().forEach((t) => t.stop()); throw new Error("Chamada encerrada"); }
    localRef.current = stream;
    setLocal(stream);
    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach((t) => {
      const sender = pc.addTrack(t, stream);
      if (t.kind === "video") {
        // Limita a taxa do vídeo para não travar em internet móvel.
        const params = sender.getParameters();
        params.encodings = [{ ...(params.encodings?.[0] ?? {}), maxBitrate: 600_000, maxFramerate: 24 }];
        params.degradationPreference = "maintain-framerate";
        void sender.setParameters(params).catch(() => {});
      }
    });
    pc.ontrack = (ev) => setRemote(ev.streams[0] ?? new MediaStream([ev.track]));
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || callRef.current?.callId !== callId) return;
      const candidate = ev.candidate.toJSON();
      if (!sdpSent.current) outgoingIce.current.push(candidate);
      else void sendSignal(peerId, { type: "ice", callId, candidate }).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected" && callRef.current?.callId === callId) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        updateCall({ ...callRef.current, status: "connected" });
      }
      if (pc.connectionState === "failed") { toast.error("Não foi possível conectar a chamada. Verifique a internet e tente de novo."); cleanup(); }
    };
    pcRef.current = pc;
    return pc;
  }

  useEffect(() => {
    if (!userId) return;
    const receive = createSignalQueue();
    const ch = supabase.channel(`social-call:${userId}`);
    ch.on("broadcast", { event: "signal" }, ({ payload }) => { void receive(async () => {
      const sig = payload as Signal;
      const cur = callRef.current;
      if (sig.type === "offer") {
        if (cur) { void sendTo(sig.from, { type: "end", callId: sig.callId }).catch(() => {}); return; }
        updateCall({ callId: sig.callId, peerId: sig.from, peerName: sig.name, video: sig.video, status: "ringing", incomingSdp: sig.sdp });
        return;
      }
      if (!cur || sig.callId !== cur.callId) return;
      if (sig.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(sig.sdp);
        for (const c of pendingIce.current) await pcRef.current.addIceCandidate(c);
        pendingIce.current = [];
      } else if (sig.type === "ice") {
        if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(sig.candidate).catch(() => {});
        else pendingIce.current.push(sig.candidate);
      } else if (sig.type === "end") {
        toast.info(cur.status === "calling" ? "Chamada não atendida." : "Chamada encerrada.");
        cleanup();
      }
    }).catch(() => { toast.error("A conexão da chamada foi interrompida. Tente novamente."); cleanup(); }); }).subscribe((status) => {
      readyRef.current = status === "SUBSCRIBED";
      if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && callRef.current) { toast.error("A conexão da chamada foi interrompida. Tente novamente."); cleanup(); }
    });
    return () => { readyRef.current = false; cleanup(); void supabase.removeChannel(ch); };
  }, [userId]);

  async function startCall(peerId: string, peerName: string, video: boolean) {
    if (callRef.current) return;
    if (!readyRef.current) { toast.error("A conexão do HS Social está sendo restabelecida. Tente novamente em instantes."); return; }
    const callId = crypto.randomUUID();
    updateCall({ callId, peerId, peerName, video, status: "calling" });
    try {
      const pc = await makePeer(peerId, callId, video);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(peerId, { type: "offer", callId, from: userId, name: myName, video, sdp: offer });
      await flushIce(peerId, callId);
      timeoutRef.current = setTimeout(() => {
        const c = callRef.current;
        if (c?.callId === callId && c.status !== "connected") { void sendTo(peerId, { type: "end", callId }).catch(() => {}); toast.info("Chamada não conectada ou não atendida."); cleanup(); }
      }, 45_000);
    } catch (error) {
      if (callRef.current?.callId !== callId) return;
      toast.error(callErrorMessage(error)); cleanup();
    }
  }

  async function accept() {
    const c = callRef.current;
    if (!c?.incomingSdp || c.status !== "ringing") return;
    updateCall({ ...c, status: "connecting" });
    try {
      const pc = await makePeer(c.peerId, c.callId, c.video);
      await pc.setRemoteDescription(c.incomingSdp);
      for (const cand of pendingIce.current) await pc.addIceCandidate(cand).catch(() => {});
      pendingIce.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(c.peerId, { type: "answer", callId: c.callId, sdp: answer });
      await flushIce(c.peerId, c.callId);
    } catch (error) {
      if (callRef.current?.callId !== c.callId) return;
      toast.error(callErrorMessage(error));
      void sendTo(c.peerId, { type: "end", callId: c.callId }).catch(() => {});
      cleanup();
    }
  }

  function hangUp() {
    const c = callRef.current;
    if (c) void sendTo(c.peerId, { type: "end", callId: c.callId }).catch(() => {});
    cleanup();
  }

  return { call, local, remote, startCall, accept, hangUp, localRef };
}

export function CallScreen({ calls }: { calls: ReturnType<typeof useSocialCalls> }) {
  const { call, local, remote, accept, hangUp } = calls;
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => { if (remoteVideo.current) remoteVideo.current.srcObject = remote; }, [remote]);
  useEffect(() => { if (localVideo.current) localVideo.current.srcObject = local; }, [local]);
  useEffect(() => {
    const audio = remoteAudio.current;
    if (!audio) return;
    audio.srcObject = remote;
    if (remote) void audio.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true));
    else setPlaybackBlocked(false);
  }, [remote, call?.callId]);
  useEffect(() => {
    if (call?.status !== "connected") { setSeconds(0); return; }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [call?.status]);
  useEffect(() => { if (!call) { setMuted(false); setCamOff(false); } }, [call]);

  if (!call) return null;
  const label = call.status === "ringing" ? (call.video ? "Chamada de vídeo recebida" : "Chamada de voz recebida")
    : call.status === "calling" ? "Chamando…" : call.status === "connecting" ? "Conectando…" : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-foreground text-background">
      <video ref={remoteVideo} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${call.video && remote ? "" : "hidden"}`} />
      <audio ref={remoteAudio} autoPlay playsInline className="hidden" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-start gap-2 pt-20 text-center">
        <p className="text-2xl font-semibold drop-shadow">{call.peerName}</p>
        <p className="text-sm opacity-80 drop-shadow">{label}</p>
        {playbackBlocked && <Button variant="secondary" onClick={() => { void remoteAudio.current?.play().then(() => setPlaybackBlocked(false)).catch(() => toast.error("Não foi possível ativar o som.")); }}><Mic className="h-4 w-4" />Ativar som da chamada</Button>}
      </div>
      {call.video && local && (
        <video ref={localVideo} autoPlay playsInline muted className="absolute right-4 top-4 z-10 h-40 w-28 rounded-xl object-cover ring-2 ring-background/40" />
      )}
      <div className="relative z-10 flex items-center justify-center gap-6 pb-12">
        {call.status === "ringing" ? (
          <>
            <Button size="icon" variant="destructive" className="h-16 w-16 rounded-full" onClick={hangUp} aria-label="Recusar"><PhoneOff className="h-7 w-7" /></Button>
            <Button size="icon" className="h-16 w-16 rounded-full bg-success text-success-foreground hover:bg-success/90" onClick={() => void accept()} aria-label="Atender">{call.video ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}</Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" aria-label={muted ? "Ativar microfone" : "Silenciar"}
              onClick={() => { local?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); }}>
              {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            {call.video && (
              <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" aria-label={camOff ? "Ligar câmera" : "Desligar câmera"}
                onClick={() => { local?.getVideoTracks().forEach((t) => (t.enabled = camOff)); setCamOff(!camOff); }}>
                {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            )}
            <Button size="icon" variant="destructive" className="h-16 w-16 rounded-full" onClick={hangUp} aria-label="Encerrar chamada"><PhoneOff className="h-7 w-7" /></Button>
          </>
        )}
      </div>
    </div>
  );
}
