import {
  Home,
  Target,
  Calendar,
  FileText,
  Wallet,
  BarChart3,
  LineChart,
  Package,
  Users,
  Contact,
  Heart,
  Images,
  BookOpen,
  ListTodo,
  History,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  fase: 1 | 2 | 3 | 4;
  soloAdmin?: boolean; // solo se muestra a administradores
};

// Secciones del mockup, en orden.
export const NAV: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, fase: 1 },
  { href: "/oportunidades", label: "Oportunidades", icon: Target, fase: 1 },
  { href: "/tareas", label: "Tareas", icon: ListTodo, fase: 4 },
  { href: "/calendario", label: "Calendario", icon: Calendar, fase: 3 },
  { href: "/facturas", label: "Documentos", icon: FileText, fase: 1 },
  { href: "/tesoreria", label: "Tesorería", icon: Wallet, fase: 2 },
  { href: "/contabilidad", label: "Contabilidad", icon: BarChart3, fase: 2 },
  { href: "/cuadro-mando", label: "Cuadro de mando", icon: LineChart, fase: 4 },
  { href: "/inventario", label: "Inventario", icon: Package, fase: 3 },
  { href: "/catalogo", label: "Catálogo", icon: Images, fase: 3 },
  { href: "/equipo", label: "Equipo", icon: Users, fase: 2 },
  { href: "/clientes", label: "Clientes", icon: Contact, fase: 1 },
  { href: "/fidelizacion", label: "Fidelización", icon: Heart, fase: 4 },
  { href: "/actividad", label: "Actividad", icon: History, fase: 4 },
  { href: "/usuarios", label: "Usuarios", icon: Shield, fase: 4, soloAdmin: true },
  { href: "/guia", label: "Guía", icon: BookOpen, fase: 4 },
];
