import {getAuth} from "firebase-admin/auth";
import {NextResponse} from "next/server";
import {z} from "zod";
import {getAdminApp} from "@/lib/firebase/admin";
import {prisma} from "@/lib/prisma";

const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().max(30).optional()});
async function getVerifiedAccount(request:Request){
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return {error:NextResponse.json({error:"Authentication is required."},{status:401})};
  try{
    const auth=getAuth(getAdminApp());
    const claims=await auth.verifyIdToken(token,true);
    const account=await auth.getUser(claims.uid);
    return {account};
  }catch(error){
    console.error("Profile authentication failed:",error);
    return {error:NextResponse.json({error:"Authentication could not be verified."},{status:401})};
  }
}

export async function PATCH(request:Request){
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const input=schema.safeParse(await request.json().catch(()=>null));
  if(!token||!input.success)return NextResponse.json({error:"Invalid profile update."},{status:400});
  let auth;
  try{auth=getAuth(getAdminApp())}
  catch(error){console.error("Firebase Admin is not configured:",error);return NextResponse.json({error:"Authentication service is not configured."},{status:500})}
  let claims;
  try{
    claims=await auth.verifyIdToken(token,true);
  }catch(error){console.error("Profile token verification failed:",error);return NextResponse.json({error:"Invalid authentication token."},{status:401})}
  try{
    const user=await prisma.user.update({where:{firebaseUid:claims.uid},data:{name:input.data.name,phone:input.data.phone||null},select:{id:true,name:true,email:true,phone:true,image:true}});
    return NextResponse.json({user});
  }catch(error){console.error("Profile update failed:",error);return NextResponse.json({error:"Unable to update your profile right now."},{status:500})}
}

export async function POST(request:Request){
  const result=await getVerifiedAccount(request);
  if(result.error)return result.error;
  try{
    const user=await prisma.user.update({
      where:{firebaseUid:result.account.uid},
      data:{emailVerified:result.account.emailVerified},
      select:{emailVerified:true},
    });
    return NextResponse.json({user});
  }catch(error){
    console.error("Could not sync profile email verification:",error);
    return NextResponse.json({error:"Unable to update email verification status."},{status:500});
  }
}
