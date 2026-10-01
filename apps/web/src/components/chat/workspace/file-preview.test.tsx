import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FilePreview } from "./file-preview";

const useGitFileMock = vi.fn();

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitFile: (...args: unknown[]) => useGitFileMock(...args),
}));

vi.mock("@pierre/diffs/react", () => ({
	File: ({ file }: { file: { name: string; contents: string } }) => (
		<pre data-testid="file">{`${file.name}:${file.contents}`}</pre>
	),
}));

beforeEach(() => vi.clearAllMocks());

describe("FilePreview", () => {
	test("renders text contents for the requested path", () => {
		useGitFileMock.mockReturnValue({
			isLoading: false,
			isError: false,
			data: { kind: "text", contents: "hello" },
		});
		render(<FilePreview onClose={vi.fn()} path="src/a.ts" threadId="t1" />);

		expect(useGitFileMock).toHaveBeenCalledWith("t1", "src/a.ts");
		expect(screen.getByTestId("file")).toHaveTextContent("src/a.ts:hello");
	});

	test.each([
		["binary", "Binary file — can't preview."],
		["too_large", "File is too large to preview."],
	])("explains %s files cannot be previewed", (reason, message) => {
		useGitFileMock.mockReturnValue({
			isLoading: false,
			isError: false,
			data: { kind: "unpreviewable", reason },
		});
		render(<FilePreview onClose={vi.fn()} path="x" threadId="t1" />);

		expect(screen.getByText(message)).toBeInTheDocument();
		expect(screen.queryByTestId("file")).not.toBeInTheDocument();
	});

	test("shows an error when the file cannot be read", () => {
		useGitFileMock.mockReturnValue({ isLoading: false, isError: true });
		render(<FilePreview onClose={vi.fn()} path="gone.ts" threadId="t1" />);

		expect(screen.getByText("Unable to read this file.")).toBeInTheDocument();
	});

	test("calls onClose from the back button", async () => {
		useGitFileMock.mockReturnValue({ isLoading: true });
		const onClose = vi.fn();
		render(<FilePreview onClose={onClose} path="a" threadId="t1" />);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Back to files" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
