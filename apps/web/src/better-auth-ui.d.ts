import type {
	ComponentPropsWithoutRef,
	ComponentType,
	PropsWithChildren,
	ReactNode,
} from "react";

declare module "@better-auth-ui/core" {
	// biome-ignore lint/style/useConsistentTypeDefinitions: must be an interface to merge with AuthConfig
	interface AuthConfig {
		Link: ComponentType<
			PropsWithChildren<
				{ className?: string; href: string; to?: string } & Pick<
					ComponentPropsWithoutRef<"a">,
					"aria-disabled" | "tabIndex" | "onClick"
				>
			>
		>;
	}

	// biome-ignore lint/style/useConsistentTypeDefinitions: must be an interface to merge with AdditionalFieldRegister
	interface AdditionalFieldRegister {
		label: ReactNode;
	}
}
