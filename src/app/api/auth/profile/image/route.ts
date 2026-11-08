import {getAuth} from "firebase-admin/auth";
import {NextResponse} from "next/server";
import {getAdminApp} from "@/lib/firebase/admin";
import {prisma} from "@/lib/prisma";

const maxImageSize=5*1024*1024;
const allowedImageTypes=new Set(["image/jpeg","image/png","image/webp"]);

export async function POST(request:Request){
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return NextResponse.json({error:"Authentication is required."},{status:401});
  const contentLength=Number(request.headers.get("content-length"));
  if(Number.isFinite(contentLength)&&contentLength>maxImageSize+64*1024){
    return NextResponse.json({error:"Choose an image smaller than 5 MB."},{status:413});
  }
  const apiKey=process.env.IMGBB_API_KEY;
  if(!apiKey)return NextResponse.json({error:"Profile image uploads are not configured."},{status:503});

  let claims;
  try{
    claims=await getAuth(getAdminApp()).verifyIdToken(token,true);
  }catch(error){
    console.error("Profile image authentication failed:",error);
    return NextResponse.json({error:"Authentication could not be verified."},{status:401});
  }

  let formData:FormData;
  try{
    formData=await request.formData();
  }catch(error){
    console.error("Could not read profile image upload:",error);
    return NextResponse.json({error:"A valid image file is required."},{status:400});
  }
  const image=formData.get("image");
  if(!(image instanceof File)||!allowedImageTypes.has(image.type)||image.size===0||image.size>maxImageSize){
    return NextResponse.json({error:"Choose a JPEG, PNG, or WebP image smaller than 5 MB."},{status:400});
  }

  const uploadData=new FormData();
  uploadData.set("image",image,image.name);
  let uploadResponse:Response;
  try{
    uploadResponse=await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,{
      method:"POST",
      body:uploadData,
      signal:AbortSignal.timeout(20_000),
    });
  }catch(error){
    console.error("ImgBB profile image upload failed:",error);
    return NextResponse.json({error:"The image service could not be reached. Please try again."},{status:502});
  }

  const upload=await uploadResponse.json().catch(()=>null) as {success?:boolean;data?:{url?:string}}|null;
  const imageUrl=upload?.data?.url;
  if(!uploadResponse.ok||!upload?.success||!imageUrl||!isSafeImageUrl(imageUrl)){
    console.error("ImgBB rejected profile image upload:",uploadResponse.status);
    return NextResponse.json({error:"The image could not be uploaded. Please try another file."},{status:502});
  }

  try{
    await prisma.user.update({where:{firebaseUid:claims.uid},data:{image:imageUrl}});
    return NextResponse.json({image:imageUrl});
  }catch(error){
    console.error("Could not save uploaded profile image:",error);
    return NextResponse.json({error:"The image was uploaded, but could not be saved to your profile."},{status:500});
  }
}

function isSafeImageUrl(value:string){
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&url.hostname==="i.ibb.co";
  }catch{
    return false;
  }
}
