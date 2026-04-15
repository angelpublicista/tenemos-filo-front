import Logo from "../../public/FILO-LOGO-ORGINAL.png"

interface FiloLogoProps {
    className?: string
}

export default function FiloLogo({ className }: FiloLogoProps) {
  return (
    <img className={`block ${className ?? ''}`} src={Logo.src} alt="Filo Logo" />
  )
}
