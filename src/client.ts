import fetch, { Response } from 'node-fetch';

export enum WorkflowStatus {
  Success = 'success',
  Running = 'running',
  NotRun = 'not_run',
  Failed = 'failed',
  Error = 'error',
  Failing = 'failing',
  OnHold = 'on_hold',
  Canceled = 'canceled',
  Unauthorized = 'unauthorized',
}

export enum RunStatus {
  Success = 'success',
  NotRun = 'not_run',
  Failed = 'failed',
  Canceled = 'canceled',
  Unauthorized = 'unauthorized',
}

export enum JobType {
  Build = 'build',
  Approval = 'approval',
}

export enum HTTPMethod {
  Post = 'post',
  Get = 'get',
  Put = 'put',
  Delete = 'delete',
}

type Paged<T> = {
  items: T[];
  next_page_token: string | null;
};

export type ErrorResponse = {
  message?: string;
};

export type Params = {
  [value: string]:
    | string
    | number
    | boolean
    | string[]
    | { [key: string]: string | number | boolean };
};

export type ProjectSlug = [
  vcsSlug: 'github' | 'bitbucket',
  orgName: string,
  repoName: string
];

export type EnvVar = {
  name: string;
  value: string;
};

export type Pipeline = {
  id: string;
  errors: {
    type: 'config' | 'plan';
    message: string;
  }[];
  project_slug: string;
  updated_at?: string;
  number: number;
  state: 'created' | 'errored' | 'pending';
  created_at: string;
  trigger: {
    type: 'explicit' | 'api' | 'webhook';
    received_at: string;
    actor: {
      login: string;
      avatar_url: string;
    };
  };
  vcs?: {
    provider_name: 'Bitbucket' | 'GitHub';
    origin_repository_url: string;
    target_repository_url: string;
    revision: string;
    branch?: string;
    tag?: string;
    commit?: {
      subject: string;
      body: string;
    };
  };
};

export type PipelineConfig = {
  source: string;
  compiled: string;
};

export type Project = {
  slug: string;
  organization_name: string;
  name: string;
  vcs_info: {
    vcs_url: string;
    default_branch: string;
    provider: 'Bitbucket' | 'GitHub';
  };
};

export type Job = {
  canceled_by?: string;
  dependencies: string[];
  job_number?: number;
  id: string;
  started_at: string;
  name: string;
  approved_by?: string;
  project_slug: string;
  status: string;
  type: JobType;
  stopped_at?: string;
  approval_request_id?: string;
};

export type WorkflowRun = {
  id: string;
  duration: number;
  created_at: string;
  stopped_at: string;
  credits_used: number;
  status: RunStatus;
};

export type JobRun = {
  id: string;
  started_at: string;
  stopped_at: string;
  status: RunStatus;
  credits_used: number;
};

export type Workflow = {
  pipeline_id: string;
  canceled_by?: string;
  id: string;
  name: string;
  project_slug: string;
  errored_by?: string;
  status: WorkflowStatus;
  started_by: string;
  pipeline_number: number;
  created_at: string;
  stopped_at: string;
};

export type SummaryMetrics = {
  name: string;
  window_start: string;
  window_end: string;
  metrics: {
    success_rate: number;
    total_runs: number;
    failed_runs: number;
    successful_runs: number;
    throughput: number;
    mttr: number;
    total_credits_used: number;
    duration_metrics: {
      min: number;
      mean: number;
      median: number;
      p95: number;
      max: number;
      standard_deviation: number;
    };
  };
};

export type CheckoutKey = {
  'public-key': string;
  type: 'deploy-key' | 'github-user-key';
  fingerprint: string;
  preferred: boolean;
  'created-at': string;
};

export class ProjectSlugError extends Error {
  constructor() {
    super('A project slug is required to call this method');
    this.name = 'ProjectSlugError';
  }
}

export class APIError extends Error {
  constructor(
    message = 'An API error occurred',
    public status: number,
    public response: Response
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class CircleCI {
  static readonly baseUrl: string = 'https://circleci.com/api/v2';

  constructor(
    private readonly apiKey: string,
    public projectSlug?: ProjectSlug | string
  ) {}

  private async request(
    method: HTTPMethod,
    path: string,
    successStatus: number,
    params?: Params
  ): Promise<{ [value: string]: any }> {
    let fullPath = `${CircleCI.baseUrl}/${path}`;
    let body: string | undefined = undefined;
    let headers: { [header: string]: string } = {
      'Circle-Token': this.apiKey,
    };

    if (params && Object.keys(params).length) {
      if ([HTTPMethod.Get, HTTPMethod.Delete].includes(method)) {
        fullPath += `?${new URLSearchParams(
          params as { [value: string]: string }
        )}`;
      }

      if ([HTTPMethod.Post, HTTPMethod.Put].includes(method)) {
        body = JSON.stringify(params);
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(fullPath, {
      method,
      headers,
      body,
    });
    const data = await response.json();

    if (response.status !== successStatus) {
      throw new APIError(
        (data as ErrorResponse).message,
        response.status,
        response
      );
    }

    return data as { [value: string]: any };
  }

  getProjectSlug(): string {
    if (!this.projectSlug) {
      throw new ProjectSlugError();
    }

    return encodeURIComponent(
      Array.isArray(this.projectSlug)
        ? this.projectSlug.join('/')
        : this.projectSlug
    );
  }

  /**
   * Retrieves a project by project slug.
   */
  async getProject(): Promise<Project> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}`,
      200
    );

    return data as Project;
  }

  /**
   * Returns a sequence of checkout keys for the project.
   */
  async listCheckoutKeys(): Promise<Paged<CheckoutKey>> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/checkout-key`,
      200
    );

    return data as Paged<CheckoutKey>;
  }

  /**
   * Creates a new checkout key.
   */
  async createCheckoutKey(
    type: 'user-key' | 'deploy-key'
  ): Promise<CheckoutKey> {
    const data = await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/checkout-key`,
      201,
      { type }
    );

    return data as CheckoutKey;
  }

  /**
   * Deletes the checkout key.
   */
  async deleteCheckoutKey(fingerprint: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `project/${this.getProjectSlug()}/checkout-key/${fingerprint}`,
      200
    );
  }

  /**
   * Returns an individual checkout key.
   */
  async getCheckoutKey(fingerprint: string): Promise<CheckoutKey> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/checkout-key/${fingerprint}`,
      200
    );

    return data as CheckoutKey;
  }

  /**
   * List all environment variables (masked).
   */
  async listEnvVars({
    pageToken,
  }: {
    pageToken?: string;
  } = {}): Promise<Paged<EnvVar>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/envvar`,
      200,
      params
    );

    return data as Paged<EnvVar>;
  }

  /**
   * Returns the masked value of an environment variable.
   */
  async getEnvVar(name: string): Promise<EnvVar> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/envvar/${encodeURIComponent(name)}`,
      200
    );

    return data as EnvVar;
  }

  /**
   * Creates a new environment variable.
   */
  async createEnvVar(name: string, value: string): Promise<EnvVar> {
    const data = await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/envvar`,
      201,
      {
        name,
        value,
      }
    );

    return data as EnvVar;
  }

  /**
   * Deletes the environment variable named.
   */
  async deleteEnvVar(name: string): Promise<void> {
    await this.request(
      HTTPMethod.Delete,
      `project/${this.getProjectSlug()}/envvar/${encodeURIComponent(name)}`,
      200
    );
  }

  /**
   * Returns summary fields of a workflow by ID.
   */
  async getWorkflow(id: string): Promise<Workflow> {
    const data = await this.request(
      HTTPMethod.Get,
      `workflow/${encodeURIComponent(id)}`,
      200
    );

    return data as Workflow;
  }

  /**
   * Cancels a running workflow.
   */
  async cancelWorkflow(id: string): Promise<void> {
    await this.request(
      HTTPMethod.Post,
      `workflow/${encodeURIComponent(id)}/cancel`,
      202
    );
  }

  /**
   * Reruns a workflow.
   */
  async rerunWorkflow(
    workflowId: string,
    { jobs, fromFailed }: { jobs?: string[]; fromFailed?: boolean } = {}
  ): Promise<void> {
    const params: Params = {};

    if (jobs) {
      params.jobs = jobs;
    }

    if (fromFailed) {
      params.fromFailed = fromFailed;
    }

    await this.request(
      HTTPMethod.Post,
      `workflow/${encodeURIComponent(workflowId)}/rerun`,
      202,
      params
    );
  }

  /**
   * Approves a pending approval job in a workflow.
   */
  async approveWorkflowJob(
    workflowId: string,
    requestId: string
  ): Promise<void> {
    await this.request(
      HTTPMethod.Post,
      `workflow/${encodeURIComponent(workflowId)}/approve/${requestId}`,
      202
    );
  }

  /**
   * Returns a sequence of jobs for a workflow.
   */
  async listWorkflowJobs(
    id: string,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<Job>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `workflow/${encodeURIComponent(id)}/job`,
      200,
      params
    );

    return data as Paged<Job>;
  }

  /**
   * Get summary metrics for a project's workflows.
   */
  async listWorkflowMetrics({
    pageToken,
    branch,
  }: {
    pageToken?: string;
    branch?: string;
  } = {}): Promise<Paged<SummaryMetrics>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch) {
      params['branch'] = branch;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows`,
      200,
      params
    );

    return data as Paged<SummaryMetrics>;
  }

  /**
   * Get summary metrics for a project workflow's jobs.
   */
  async listWorkflowJobMetrics(
    workflowName: string,
    {
      pageToken,
      branch,
    }: {
      pageToken?: string;
      branch?: string;
    } = {}
  ): Promise<Paged<SummaryMetrics>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch) {
      params['branch'] = branch;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows/${workflowName}/jobs`,
      200,
      params
    );

    return data as Paged<SummaryMetrics>;
  }

  /**
   * Get recent runs of a workflow.
   */
  async listWorkflowRuns(
    workflowName: string,
    {
      pageToken,
      branch,
      startDate,
      endDate,
    }: {
      pageToken?: string;
      branch?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<Paged<WorkflowRun>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch) {
      params['branch'] = branch;
    }
    if (startDate) {
      params['start-date'] = startDate;
    }
    if (endDate) {
      params['end-date'] = endDate;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows/${workflowName}`,
      200,
      params
    );

    return data as Paged<WorkflowRun>;
  }

  /**
   * Get recent runs of a job within a workflow.
   */
  async listWorkflowJobRuns(
    workflowName: string,
    jobName: string,
    {
      pageToken,
      branch,
      startDate,
      endDate,
    }: {
      pageToken?: string;
      branch?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<Paged<WorkflowRun>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch) {
      params['branch'] = branch;
    }
    if (startDate) {
      params['start-date'] = startDate;
    }
    if (endDate) {
      params['end-date'] = endDate;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `insights/${this.getProjectSlug()}/workflows/${workflowName}/jobs/${jobName}`,
      200,
      params
    );

    return data as Paged<WorkflowRun>;
  }

  /**
   * Returns all pipelines for the most recently built projects
   * you follow in an organization.
   */
  async listPipelines(
    orgSlug: string,
    {
      pageToken,
      onlyMine,
    }: {
      pageToken?: string;
      onlyMine?: boolean;
    } = {}
  ): Promise<Paged<Pipeline>> {
    const params: Params = {
      'org-slug': orgSlug,
    };
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (onlyMine) {
      params['mine'] = onlyMine;
    }

    const data = await this.request(HTTPMethod.Get, `pipeline`, 200, params);

    return data as Paged<Pipeline>;
  }

  /**
   * Returns a pipeline by ID.
   */
  async getPipeline(pipelineId: string): Promise<Pipeline> {
    const data = await this.request(
      HTTPMethod.Get,
      `pipeline/${pipelineId}`,
      200
    );

    return data as Pipeline;
  }

  /**
   * Returns a pipeline's configuration by ID.
   */
  async getPipelineConfig(pipelineId: string): Promise<PipelineConfig> {
    const data = await this.request(
      HTTPMethod.Get,
      `pipeline/${pipelineId}/config`,
      200
    );

    return data as PipelineConfig;
  }

  /**
   * Returns a paginated list of workflows by pipeline ID.
   */
  async listPipelineWorkflows(
    pipelineId: string,
    {
      pageToken,
    }: {
      pageToken?: string;
    } = {}
  ): Promise<Paged<Workflow>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `pipeline/${pipelineId}/workflow`,
      200,
      params
    );

    return data as Paged<Workflow>;
  }

  /**
   * Triggers a new pipeline on the project.
   */
  async triggerProjectPipeline({
    branch,
    tag,
    parameters,
  }: {
    branch?: string;
    tag?: string;
    parameters?: { [key: string]: string | number | boolean };
  }): Promise<PipelineConfig> {
    const params: Params = {};
    if (branch) {
      params['branch'] = branch;
    }
    if (tag) {
      params['tag'] = tag;
    }
    if (parameters) {
      params['parameters'] = parameters;
    }

    const data = await this.request(
      HTTPMethod.Post,
      `project/${this.getProjectSlug()}/pipeline`,
      201,
      params
    );

    return data as PipelineConfig;
  }

  /**
   * Returns all pipelines for this project.
   */
  async listProjectPipelines({
    pageToken,
    branch,
  }: {
    pageToken?: string;
    branch?: string;
  } = {}): Promise<Paged<Pipeline>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }
    if (branch) {
      params['branch'] = branch;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/pipeline`,
      200,
      params
    );

    return data as Paged<Pipeline>;
  }

  /**
   * Returns a sequence of all pipelines for this
   * project triggered by the user.
   */
  async listOwnProjectPipelines({
    pageToken,
  }: {
    pageToken?: string;
  } = {}): Promise<Paged<Pipeline>> {
    const params: Params = {};
    if (pageToken) {
      params['page-token'] = pageToken;
    }

    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/pipeline/mine`,
      200,
      params
    );

    return data as Paged<Pipeline>;
  }

  /**
   * Returns a pipeline by number.
   */
  async getProjectPipeline(pipelineNumber: string): Promise<Pipeline> {
    const data = await this.request(
      HTTPMethod.Get,
      `project/${this.getProjectSlug()}/pipeline/${pipelineNumber}`,
      200
    );

    return data as Pipeline;
  }
}

export default CircleCI;