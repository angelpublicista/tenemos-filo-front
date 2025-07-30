import Logo from "../../public/FILO-LOGO-ORGINAL.png"

interface FiloLogoProps {
    className?: string
}

export default function FiloLogo({ className }: FiloLogoProps) {
  return (
    <div className={className}>
        <img className='w-full' src={Logo.src} alt="Filo Logo" />
    </div>
  )
}
