import {MapPin, Phone} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export function SiteFooter() {
  const t=useTranslations("home"); const n=useTranslations("nav");
  return <footer className="site-footer"><div className="footer-main"><div><Link className="brand brand-inverted" href="/"><span className="brand-mark"><span/></span><span>smile<span className="brand-light">craft</span></span></Link><p>{t("footer")}</p></div><div className="footer-links"><div><span className="footer-label">Explore</span><Link href="/about">{n("about")}</Link><Link href="/services">{n("services")}</Link><Link href="/doctors">{n("doctors")}</Link></div><div><span className="footer-label">Visit us</span><span><MapPin size={15}/>Gulshan Avenue, Dhaka</span><span><Phone size={15}/>+880 1700-000000</span><Link href="/contact">{n("contact")}</Link></div></div></div><div className="footer-bottom"><span>SmileCraft · Smile Care Dental Clinic</span><span>Gentle care. Brighter smiles. <b className="heart">♥</b></span></div></footer>;
}
