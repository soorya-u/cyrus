import { AUTH_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation } from "@tanstack/react-query";
import { log } from "evlog";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { authClient } from "@/lib/auth";

type SocialProvider = Parameters<
	typeof authClient.signIn.social
>[0]["provider"];

export function useAuthDesktop(provider: SocialProvider) {
	const { copy } = useCopyToClipboard();

	const trySignIn = () => authClient.signIn.social({ provider });

	const copyLinkMutation = useMutation({
		mutationKey: AUTH_OPERATION_KEYS.copySignInLink,
		mutationFn: async () => {
			const result = await authClient.signIn.social({
				provider,
				disableRedirect: true,
			});
			const url = result?.data?.url;
			if (!url) throw new Error("No sign-in URL returned");
			await copy(url);
		},
		onSuccess: () => toast.success("Link copied to clipboard"),
		onError: (error) => {
			log.error({ kind: "auth_desktop_copy_link", error, provider });
			toast.error("Couldn't copy the sign-in link. Please try again.");
		},
	});

	return {
		trySignIn,
		copyLink: () => copyLinkMutation.mutate(),
		isCopying: copyLinkMutation.isPending,
	};
}
