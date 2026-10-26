/** Accept only the selected profile's own private object; never sign arbitrary caller paths. */
export async function signSocialAvatar(db: any, person: {id:string;avatar_url?:string|null}) {
  const value=person.avatar_url;
  if(!value)return null;
  if(value.startsWith('data:image/'))return value;
  let path=value;
  if(value.startsWith('https://')){
    const url=new URL(value);
    const match=url.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/social-stories\/(.+)$/);
    if(!match)return value;
    path=decodeURIComponent(match[1]);
  }
  if(!path.startsWith(`${person.id}/profile-`) || path.includes('..'))return null;
  const result=await db.storage.from('social-stories').createSignedUrl(path,300);
  return result.error ? null : result.data?.signedUrl ?? null;
}