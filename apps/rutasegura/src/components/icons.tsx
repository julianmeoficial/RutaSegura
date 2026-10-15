import {
  TriangleAlert,
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CircleCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  CircleHelp,
  Info,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

/** Iconos Lucide de 20 px y trazo 1.75 que heredan el color del texto. */
type IconProps = { size?: number; className?: string; label?: string };

function icon(Glyph: LucideIcon) {
  function Icon({ size = 20, className, label }: IconProps) {
    return (
      <Glyph
        size={size}
        strokeWidth={1.75}
        className={className}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
      />
    );
  }
  return Icon;
}

export const IconSearch = icon(Search);
export const IconTruck = icon(Truck);
export const IconPackage = icon(Package);
export const IconCheck = icon(Check);
export const IconCheckCircle = icon(CircleCheck);
export const IconMapPin = icon(MapPin);
export const IconClock = icon(Clock);
export const IconCalendar = icon(Calendar);
export const IconFile = icon(FileText);
export const IconDownload = icon(Download);
export const IconBell = icon(Bell);
export const IconShield = icon(ShieldCheck);
export const IconLock = icon(Lock);
export const IconUser = icon(User);
export const IconLogout = icon(LogOut);
export const IconMenu = icon(Menu);
export const IconClose = icon(X);
export const IconArrowRight = icon(ArrowRight);
export const IconArrowLeft = icon(ArrowLeft);
export const IconAlert = icon(TriangleAlert);
export const IconInfo = icon(Info);
export const IconHelp = icon(CircleHelp);
export const IconEye = icon(Eye);
export const IconEyeOff = icon(EyeOff);
export const IconChevronRight = icon(ChevronRight);
export const IconChevronDown = icon(ChevronDown);
export const IconPlus = icon(Plus);
export const IconRefresh = icon(RefreshCw);
