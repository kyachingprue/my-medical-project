import {getApps,initializeApp,type App,type Credential} from "firebase-admin/app";
import {JWT} from "google-auth-library";

const scopes=[
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/firebase.database",
  "https://www.googleapis.com/auth/firebase.messaging",
  "https://www.googleapis.com/auth/identitytoolkit",
  "https://www.googleapis.com/auth/userinfo.email",
];

function createServiceAccountCredential(clientEmail:string,privateKey:string):Credential{
  const jwt=new JWT({email:clientEmail,key:privateKey,scopes});
  return {
    async getAccessToken(){
      const {token}=await jwt.getAccessToken();
      const expiryDate=jwt.credentials.expiry_date;
      if(!token||typeof expiryDate!=="number")throw new Error("Could not obtain a Firebase Admin access token.");
      return {access_token:token,expires_in:Math.max(0,Math.floor((expiryDate-Date.now())/1000))};
    },
  };
}

export function getAdminApp():App{
  const existing=getApps()[0];
  if(existing)return existing;
  const {FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY}=process.env;
  if(!FIREBASE_PROJECT_ID||!FIREBASE_CLIENT_EMAIL||!FIREBASE_PRIVATE_KEY)throw new Error("Firebase Admin credentials are not configured.");
  return initializeApp({
    credential:createServiceAccountCredential(FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n")),
    projectId:FIREBASE_PROJECT_ID,
  });
}
