import { MessageCircle } from "lucide-react";

const BD_WORLD = "https://api.whatsapp.com/send?phone=8801964719770";
const PK = "https://api.whatsapp.com/send?phone=923325666470";

export function SupportPopups() {
  return (
    <>
      <a
        href={BD_WORLD}
        target="_blank"
        rel="noreferrer"
        className="support-float support-float-left"
        aria-label="Bangladesh and worldwide WhatsApp support"
      >
        <span className="support-icon"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:block">
          <b>BD + Worldwide</b>
          <small>WhatsApp Support</small>
        </span>
      </a>
      <a
        href={PK}
        target="_blank"
        rel="noreferrer"
        className="support-float support-float-right"
        aria-label="Pakistan WhatsApp support"
      >
        <span className="support-icon"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:block">
          <b>Pakistan</b>
          <small>WhatsApp Support</small>
        </span>
      </a>
    </>
  );
}
