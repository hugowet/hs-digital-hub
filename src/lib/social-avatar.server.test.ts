import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signSocialAvatar} from './social-avatar.server';
test('foto de perfil privada recebe URL nova de cinco minutos',async()=>{
 let calls=0;const db={storage:{from:(bucket:string)=>({createSignedUrl:async(path:string,seconds:number)=>{assert.equal(bucket,'social-stories');assert.equal(path,'user/profile-1.jpg');assert.equal(seconds,300);calls++;return {data:{signedUrl:'https://example.com/fresh'}};}})}};
 assert.equal(await signSocialAvatar(db,{id:'user',avatar_url:'user/profile-1.jpg'}),'https://example.com/fresh');assert.equal(calls,1);
 assert.equal(await signSocialAvatar(db,{id:'other',avatar_url:'user/profile-1.jpg'}),null);assert.equal(calls,1);
});