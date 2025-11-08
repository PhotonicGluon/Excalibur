/** Represents a job that is currently running */
export interface Job {
    /** Name of the file handled by the job */
    filename: string;
    /** Status of the job */
    status: string;
    /** Progress of the job.
     *
     * A `null` value means indeterminate progress.
     */
    progress: number | null;
}

// TODO: Update contents
// TODO: Add tests
const JobEntry: React.FC<Job> = (job) => {
    return (
        <div className="flex items-center justify-between">
            <span>{job.filename}</span>
            <span>{job.progress ? `${job.progress * 100}%` : ""}</span>
            <span>{job.status}</span>
        </div>
    );
};

export default JobEntry;
