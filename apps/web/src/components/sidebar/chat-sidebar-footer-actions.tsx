import { cn } from "cnfast";
import { LogOutIcon, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth";

const footerButtonClassName =
	"gap-2 px-2 py-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground";

export function ChatSidebarFooterActions() {
	const { isMobile, setOpenMobile } = useSidebar();
	const { data: session } = authClient.useSession();
	const { resolvedTheme, setTheme } = useTheme();
	const theme = resolvedTheme === "dark" ? "dark" : "light";

	const handleSignOut = () => {
		if (isMobile) setOpenMobile(false);
		authClient.signOut();
	};

	const handleToggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
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
				<SidebarMenuButton
					className={footerButtonClassName}
					onClick={handleToggleTheme}
					size="sm"
				>
					{theme === "dark" ? (
						<Sun className="size-3.5 shrink-0" />
					) : (
						<Moon className="size-3.5 shrink-0" />
					)}
					<span className="text-xs">Change Theme</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</>
	);
}
