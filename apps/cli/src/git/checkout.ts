import {
	branchAlreadyCheckedOutError,
	type GitError,
	GitNotRepositoryError,
} from "@cyrus/errors/git";
import { Result } from "better-result";
import { findBranchCheckedOutElsewhere } from "./checked-out";
import { openGitRepository, operationFailedFromUnknown } from "./open";

export async function checkoutGitRef(
	cwd: string,
	refName: string
): Promise<Result<void, GitError>> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return Result.err(opened.error);

	const conflictPath = findBranchCheckedOutElsewhere(
		opened.value,
		refName,
		cwd
	);
	if (conflictPath) {
		return Result.err(branchAlreadyCheckedOutError(refName, conflictPath));
	}

	const checkout = Result.try(() => {
		opened.value.setHead(`refs/heads/${refName}`);
		opened.value.checkoutHead();
	});
	if (checkout.isErr()) {
		return Result.err(operationFailedFromUnknown(checkout.error));
	}
	return Result.ok(undefined);
}

export async function tryCheckoutGitRef(
	cwd: string,
	refName: string
): Promise<Result<void, GitError>> {
	const result = await checkoutGitRef(cwd, refName);
	if (result.isErr() && GitNotRepositoryError.is(result.error)) {
		return Result.ok(undefined);
	}
	return result;
}
