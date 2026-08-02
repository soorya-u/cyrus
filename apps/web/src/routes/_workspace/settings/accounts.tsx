import { createFileRoute } from "@tanstack/react-router";
import { LinkedAccounts } from "@/components/auth/security/linked-accounts";

export const Route = createFileRoute("/_workspace/settings/accounts")({
	component: SettingsAccountsPage,
});

function SettingsAccountsPage() {
	return (
		<>
			<div className="surface-subheader">
				<span className="font-medium text-sm">Settings</span>
			</div>

			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
				<LinkedAccounts />
			</div>
		</>
	);
}
