const serviceImages:Record<string,string>={
  "dental-checkup":"/services/dental-checkup.png",
  scaling:"/services/Scaling.jpg",
  "root-canal":"/services/root-canal-treatment.jpg",
  "tooth-extraction":"/services/extraction.jpg.jpeg",
  "teeth-whitening":"/services/teeth-whitening.jpg",
};

const doctorImages:Record<string,string>={
  "nasrin-sultana":"/doctor/nasin-sultana.jpg",
  rahman:"/doctor/rahman.jpg",
  "maria-akter":"/doctor/maria-akter.jpg",
};

export function getServiceDirectoryImage(image:string|null,slug:string){
  return image||serviceImages[slug]||null;
}

export function getDoctorDirectoryImage(image:string|null,name:string){
  const slug=name.trim().toLowerCase().replace(/^dr\.?\s*/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return image||doctorImages[slug]||null;
}
