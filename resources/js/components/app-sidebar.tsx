import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid } from 'lucide-react';
import AppLogo from './app-logo';
import { Home,Ticket,User,Clock, Receipt} from "lucide-react";

const mainNavItems: NavItem[] = [
    
    { title: "Dashboard", href: "/dashboard", icon: Home }, 
    { title: "Ticket", href: "/ticket", icon: Ticket },
    { title: "Records", href: "/records", icon: Receipt },
    { title: "Users", href: "/users", icon: User },
    { title: "Computation", href: "/computation", icon: Clock },

];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <img src="https://www.revlv.com/revlv-logo-inverted.svg" alt="revlv" className='h-10 w-10 '/>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent >
                <NavMain items={mainNavItems} />
            </SidebarContent>
            

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
