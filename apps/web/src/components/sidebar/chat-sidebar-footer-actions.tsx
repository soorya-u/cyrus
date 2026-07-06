import { cn } from "cnfast";
import { LogOutIcon, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth";

const footerButtonClassName =
	"gap-2 px-2 py-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground";

const themeButtonClassName = cn(
	"peer/menu-button flex h-7 w-full cursor-pointer items-center overflow-hidden rounded-lg text-left text-xs outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
	footerButtonClassName
);

export function ChatSidebarFooterActions() {
	const { isMobile, setOpenMobile } = useSidebar();
	const { data: session } = authClient.useSession();
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const theme = resolvedTheme === "dark" ? "dark" : "light";

	const handleSignOut = () => {
		if (isMobile) setOpenMobile(false);
		authClient.signOut();
	};

	return (
		<>
			{session?.user ? (
				<SidebarMenuItem>
					<SidebarMenuButton
						className={cn(
							footerButtonClassName,
							"hover:text-red-500 hover:[&_svg]:text-red-500"
						)}
						onClick={handleSignOut}
						size="sm"
					>
						<LogOutIcon className="size-3.5" />
						<span className="text-xs">Sign Out</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			) : null}
			<SidebarMenuItem>
				{mounted ? (
					<AnimatedThemeToggler
						className={themeButtonClassName}
						data-sidebar="menu-button"
						data-size="sm"
						data-slot="sidebar-menu-button"
						onThemeChange={setTheme}
						theme={theme}
					>
						{theme === "dark" ? (
							<Sun className="size-3.5 shrink-0" />
						) : (
							<Moon className="size-3.5 shrink-0" />
						)}
						<span className="text-xs">Change Theme</span>
					</AnimatedThemeToggler>
				) : (
					<SidebarMenuButton className={footerButtonClassName} size="sm">
						<Moon className="size-3.5" />
						<span className="text-xs">Change Theme</span>
					</SidebarMenuButton>
				)}
			</SidebarMenuItem>
		</>
	);
}
