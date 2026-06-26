import type {
	ComponentPropsWithoutRef,
	ComponentType,
	PropsWithChildren,
	ReactNode,
} from "react";

declare module "@better-auth-ui/core" {
	type AuthConfig = {
		Link: ComponentType<
			PropsWithChildren<
				{ className?: string; href: string; to?: string } & Pick<
					ComponentPropsWithoutRef<"a">,
					"aria-disabled" | "tabIndex" | "onClick"
				>
			>
		>;
	};

	type AdditionalFieldRegister = {
		label: ReactNode;
	};
}
