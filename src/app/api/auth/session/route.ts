import {getAuth} from "firebase-admin/auth";
import {NextResponse} from "next/server";
import {z} from "zod";
import {getAdminApp} from "@/lib/firebase/admin";
import {getCurrentUser,SESSION_COOKIE} from "@/lib/auth/session";
import {prisma} from "@/lib/prisma";

const schema=z.object({idToken:z.string().min(1),expectedRole:z.enum(["PATIENT","RECEPTIONIST","ADMIN"])});
export async function GET(){
  const user=await getCurrentUser();
  return user?NextResponse.json({user:{name:user.name,email:user.email,image:user.image,role:user.role}}):NextResponse.json({user:null},{status:401});
}
export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"A valid ID token is required."},{status:400});
  let auth;
  try{
    auth=getAuth(getAdminApp());
  }catch(error){console.error("Firebase Admin is not configured:",error);return NextResponse.json({error:"Authentication service is not configured."},{status:500})}
  let claims;
  let account;
  try{
    claims=await auth.verifyIdToken(parsed.data.idToken,true);
    account=await auth.getUser(claims.uid);
  }catch(error){console.error("Firebase token verification failed:",error);return NextResponse.json({error:"Invalid authentication token."},{status:401})}
  const email=account.email??`${account.uid}@missing-email.invalid`;
  let user;
  try{
    user=await prisma.$transaction(async tx=>{
      const existing=await tx.user.findUnique({where:{firebaseUid:account.uid},select:{id:true}});
      const saved=await tx.user.upsert({where:{firebaseUid:account.uid},update:{name:account.displayName??email,email,image:account.photoURL??null,emailVerified:account.emailVerified},create:{firebaseUid:account.uid,name:account.displayName??email,email,image:account.photoURL??null,emailVerified:account.emailVerified,role:"PATIENT"},select:{id:true,role:true}});
      if(!existing)await tx.auditLog.create({data:{actorUid:account.uid,actorEmail:email,action:"REGISTER",entity:"User",entityId:saved.id,details:{role:saved.role}}});
      return saved;
    },{maxWait:10_000,timeout:20_000});
  }catch(error){console.error("Could not persist authenticated user:",error);return NextResponse.json({error:"Unable to load your account right now."},{status:500})}
  if(user.role!==parsed.data.expectedRole)return NextResponse.json({error:"ROLE_MISMATCH",role:user.role},{status:403});
  try{
    const cookie=await auth.createSessionCookie(parsed.data.idToken,{expiresIn:5*24*60*60*1000});
    const response=NextResponse.json({role:user.role});
    response.cookies.set(SESSION_COOKIE,cookie,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:5*24*60*60});
    return response;
  }catch(error){console.error("Could not create authenticated session:",error);return NextResponse.json({error:"Unable to start your session right now."},{status:500})}
}
export async function DELETE(){
  let revocationFailed=false;
  try{
    const user=await getCurrentUser();
    if(user)await getAuth(getAdminApp()).revokeRefreshTokens(user.firebaseUid);
  }catch(error){
    console.error("Could not revoke Firebase sessions during logout:",error);
    revocationFailed=true;
  }
  const response=revocationFailed
    ?NextResponse.json({error:"Your local session was cleared, but remote session revocation failed."},{status:500})
    :NextResponse.json({success:true});
  response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  return response;
}
