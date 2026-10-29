import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {JobRow} from "./JobRow";
import type {JobModel} from "../model/JobModel";

const job: JobModel = {id: "job-1", name: "process-new-file", queue: "import", status: "failed", progress: 0,
    data: {fileName: "a-long-import-filename.epub"}, result: null, failedReason: "The upload could not be read. Check the original EPUB file.",
    createdAt: "2026-10-15T12:00:00Z", processedAt: null, finishedAt: null, attemptsMade: 2};

describe("job history details", () => {
    it("retains full failure, file context, and expandable technical details", () => {
        render(<Provider><JobRow job={job}/></Provider>);
        expect(screen.getByText(job.failedReason!)).toBeVisible();
        expect(screen.getByText("a-long-import-filename.epub")).toBeVisible();
        expect(screen.getByText("Failed")).toBeVisible();
        expect(screen.getByText("Technical details").tagName).toBe("SUMMARY");
        expect(screen.getByText("Attempts: 2")).toBeInTheDocument();
        expect(screen.getByText("Job job-1 in import")).toBeInTheDocument();
    });

    it("shows active progress even before the first work item completes", () => {
        render(<Provider><JobRow job={{...job, status: "active", failedReason: null}}/></Provider>);
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
        expect(screen.getByText("Running")).toBeVisible();
        expect(screen.getByText("Job progress: 0%")).toBeVisible();
    });
});
