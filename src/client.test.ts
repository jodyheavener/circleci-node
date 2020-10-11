import pck from '../package.json';
import { FetchMock } from 'jest-fetch-mock';
import CircleCI, {
  APIError,
  ArgumentError,
  HTTPMethod,
  Params,
  ProjectSlug,
  ProjectSlugError,
} from './client';

const apiKey = 'supposed to be';
const projectSlug = ['github', 'example', 'repo'] as ProjectSlug;
const client = new CircleCI(apiKey, projectSlug);
const pageToken = 'forest-whitaker';
const envVarName = 'every-stone';
const envVarValue = 'trees';
const workflowId = 'sleeper-1972';
const pipelineId = 'easy-lucky-free';
const jobId = 'four-winds';
const branch = 'pan-and-broom';
const startDate = '2019-08-24T14:15:22Z';
const endDate = '2019-08-24T14:15:22Z';
const sshFingerprint = 'the-grocery';
const jobNumber = 82;
const contextId = 'colly-strings';

const fetchMock = fetch as FetchMock;
function mockFetch(status = 200, body = {}) {
  fetchMock.mockResponseOnce(JSON.stringify(body), { status });
}

function expectFetch(
  method: HTTPMethod,
  path: string,
  body?: Params,
  headers: { [header: string]: string } = {}
) {
  expect(fetch).toHaveBeenCalledWith(`${CircleCI.baseUrl}/${path}`, {
    method,
    headers: expect.objectContaining(
      Object.assign(
        {
          'Circle-Token': apiKey,
          'X-Circle-Client': `v${pck.version}`,
        },
        [HTTPMethod.Post, HTTPMethod.Put].includes(method) && body
          ? { 'Content-Type': 'application/json' }
          : {},
        headers
      )
    ),
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('errors', () => {
  describe('ProjectSlugError', () => {
    beforeAll(() => {
      client.projectSlug = undefined;
    });

    afterAll(() => {
      client.projectSlug = projectSlug;
    });

    it('throws with no project slug set and a method that requires one is called', () => {
      expect(() => {
        client.getProjectSlug();
      }).toThrow(ProjectSlugError);
    });
  });

  describe('APIError', () => {
    it('throws when the request returns a non-success status code', async () => {
      // Produce status code 123
      mockFetch(123);

      try {
        await client.listEnvVars();
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).status).toBe(123);
        expect((error as APIError).message).not.toBeNull();
      }
    });
  });
});

describe('getProject', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getProject();
    expectFetch(HTTPMethod.Get, `project/${client.getProjectSlug()}`);
  });
});

describe('listCheckoutKeys', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listCheckoutKeys();
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/checkout-key`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listCheckoutKeys({ pageToken });
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/checkout-key?page-token=${pageToken}`
    );
  });
});

describe('createCheckoutKey', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch(201);
    await client.createCheckoutKey('user-key');
    expectFetch(
      HTTPMethod.Post,
      `project/${client.getProjectSlug()}/checkout-key`,
      { type: 'user-key' }
    );
  });
});

describe('deleteCheckoutKey', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.deleteCheckoutKey(sshFingerprint);
    expectFetch(
      HTTPMethod.Delete,
      `project/${client.getProjectSlug()}/checkout-key/${sshFingerprint}`
    );
  });
});

describe('getCheckoutKey', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getCheckoutKey(sshFingerprint);
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/checkout-key/${sshFingerprint}`
    );
  });
});

describe('listEnvVars', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listEnvVars();
    expectFetch(HTTPMethod.Get, `project/${client.getProjectSlug()}/envvar`);
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listEnvVars({ pageToken });
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/envvar?page-token=${pageToken}`
    );
  });
});

describe('getEnvVar', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getEnvVar(envVarName);
    expectFetch(
      HTTPMethod.Get,
      `projec/${client.getProjectSlug()}/envvar/${envVarName}`
    );
  });
});

describe('createEnvVar', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch(201);
    await client.createEnvVar(envVarName, envVarValue);
    expectFetch(HTTPMethod.Post, `project/${client.getProjectSlug()}/envvar`, {
      name: envVarName,
      value: envVarValue,
    });
  });
});

describe('getWorkflow', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getWorkflow(workflowId);
    expectFetch(HTTPMethod.Get, `workflow/${workflowId}`);
  });
});

describe('cancelWorkflow', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch(202);
    await client.cancelWorkflow(workflowId);
    expectFetch(HTTPMethod.Post, `workflow/${workflowId}/cancel`);
  });
});

describe('rerunWorkflow', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch(202);
    await client.rerunWorkflow(workflowId);
    expectFetch(HTTPMethod.Post, `workflow/${workflowId}/rerun`);
  });

  it('can specify jobs and fromFailed', async () => {
    const jobs = ['colly', 'strings'];
    const fromFailed = true;
    mockFetch(202);
    await client.rerunWorkflow(workflowId, { jobs, fromFailed });
    expectFetch(HTTPMethod.Post, `workflow/${workflowId}/rerun`, {
      jobs,
      fromFailed,
    });
  });
});

describe('approveWorkflowJob', () => {
  it('constructs request with the correct arguments', async () => {
    const requestId = 'golden-ticket';
    mockFetch(202);
    await client.approveWorkflowJob(workflowId, requestId);
    expectFetch(HTTPMethod.Post, `workflow/${workflowId}/approve/${requestId}`);
  });
});

describe('listWorkflowJobs', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listWorkflowJobs(workflowId);
    expectFetch(HTTPMethod.Post, `workflow/${workflowId}/job`);
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listWorkflowJobs(workflowId, { pageToken });
    expectFetch(
      HTTPMethod.Get,
      `workflow/${workflowId}/job?page-token=${pageToken}`
    );
  });
});

describe('listWorkflowMetrics', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listWorkflowMetrics();
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows?page-token=${pageToken}`
    );
  });

  it('can specify a branch', async () => {
    mockFetch();
    await client.listWorkflowMetrics({ branch });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows?branch=${branch}`
    );
  });
});

describe('listWorkflowJobMetrics', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listWorkflowJobMetrics(workflowId);
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listWorkflowJobMetrics(workflowId, { pageToken });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs?page-token=${pageToken}`
    );
  });

  it('can specify a branch', async () => {
    mockFetch();
    await client.listWorkflowJobMetrics(workflowId, { branch });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs?branch=${branch}`
    );
  });
});

describe('listWorkflowRuns', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listWorkflowRuns(workflowId);
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listWorkflowRuns(workflowId, { pageToken });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}?page-token=${pageToken}`
    );
  });

  it('can specify a branch', async () => {
    mockFetch();
    await client.listWorkflowRuns(workflowId, { branch });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}?branch=${branch}`
    );
  });

  it('can specify a start and end dates', async () => {
    mockFetch();
    await client.listWorkflowRuns(workflowId, { startDate, endDate });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}?start-date=${encodeURIComponent(
        startDate
      )}&end-date=${encodeURIComponent(endDate)}`
    );
  });
});

describe('listWorkflowJobRuns', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listWorkflowJobRuns(workflowId, jobId);
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs/${jobId}`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listWorkflowJobRuns(workflowId, jobId, { pageToken });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs/${jobId}?page-token=${pageToken}`
    );
  });

  it('can specify a branch', async () => {
    mockFetch();
    await client.listWorkflowJobRuns(workflowId, jobId, { branch });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs/${jobId}?branch=${branch}`
    );
  });

  it('can specify a start and end dates', async () => {
    mockFetch();
    await client.listWorkflowJobRuns(workflowId, jobId, { startDate, endDate });
    expectFetch(
      HTTPMethod.Get,
      `insights/${client.getProjectSlug()}/workflows/${workflowId}/jobs/${jobId}?start-date=${encodeURIComponent(
        startDate
      )}&end-date=${encodeURIComponent(endDate)}`
    );
  });
});

describe('listPipelines', () => {
  const orgSlug = 'light/pollution';

  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listPipelines(orgSlug);
    expectFetch(
      HTTPMethod.Get,
      `pipeline?org-slug=${encodeURIComponent(orgSlug)}`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listPipelines(orgSlug, { pageToken });
    expectFetch(
      HTTPMethod.Get,
      `pipeline?org-slug=${encodeURIComponent(orgSlug)}&page-token=${pageToken}`
    );
  });

  it('can specify only owned pipelines', async () => {
    mockFetch();
    await client.listPipelines(orgSlug, { onlyMine: true });
    expectFetch(
      HTTPMethod.Get,
      `pipeline?org-slug=${encodeURIComponent(orgSlug)}&mine=true`
    );
  });
});

describe('getPipeline', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getPipeline(pipelineId);
    expectFetch(HTTPMethod.Get, `pipeline/${pipelineId}`);
  });
});

describe('getPipelineConfig', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getPipelineConfig(pipelineId);
    expectFetch(HTTPMethod.Get, `pipeline/${pipelineId}/config`);
  });
});

describe('getPipelineConfig', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getPipelineConfig(pipelineId);
    expectFetch(HTTPMethod.Get, `pipeline/${pipelineId}/config`);
  });
});

describe('listPipelineWorkflows', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listPipelineWorkflows(pipelineId);
    expectFetch(HTTPMethod.Get, `pipeline/${pipelineId}/workflow`);
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listPipelineWorkflows(pipelineId, { pageToken });
    expectFetch(
      HTTPMethod.Get,
      `pipeline/${pipelineId}/workflow?page-token=${pageToken}`
    );
  });
});

describe('triggerProjectPipeline', () => {
  it('can specify a branch', async () => {
    mockFetch(201);
    await client.triggerProjectPipeline({ branch });
    expectFetch(
      HTTPMethod.Post,
      `project/${client.getProjectSlug()}/pipeline`,
      { branch }
    );
  });

  it('can specify a tag', async () => {
    const tag = 'v90210';
    mockFetch(201);
    await client.triggerProjectPipeline({ tag });
    expectFetch(
      HTTPMethod.Post,
      `project/${client.getProjectSlug()}/pipeline`,
      { tag }
    );
  });

  it('can specify additional params', async () => {
    mockFetch(201);
    await client.triggerProjectPipeline({
      branch,
      parameters: {
        laura: 'laurent',
      },
    });
    expectFetch(
      HTTPMethod.Post,
      `project/${client.getProjectSlug()}/pipeline`,
      {
        branch,
        parameters: {
          laura: 'laurent',
        },
      }
    );
  });
});

describe('listProjectPipelines', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listProjectPipelines();
    expectFetch(HTTPMethod.Get, `project/${client.getProjectSlug()}/pipeline`);
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listProjectPipelines({ pageToken });
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/pipeline?page-token=${pageToken}`
    );
  });

  it('can specify a branch', async () => {
    mockFetch();
    await client.listProjectPipelines({ branch });
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/pipeline?branch=${branch}`
    );
  });
});

describe('listOwnProjectPipelines', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.listOwnProjectPipelines();
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/pipeline/mine`
    );
  });

  it('can specify a page token', async () => {
    mockFetch();
    await client.listOwnProjectPipelines({ pageToken });
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/pipeline/mine?page-token=${pageToken}`
    );
  });
});

describe('getProjectPipeline', () => {
  it('constructs request with the correct arguments', async () => {
    mockFetch();
    await client.getProjectPipeline(pipelineId);
    expectFetch(
      HTTPMethod.Get,
      `project/${client.getProjectSlug()}/pipeline/${pipelineId}`
    );
  });
});

describe('previews', () => {
  beforeAll(() => {
    global.console.warn = jest.fn();
  });

  describe('getJob', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.getJob(jobNumber);
      expectFetch(
        HTTPMethod.Get,
        `project/${client.getProjectSlug()}/job/${jobNumber}`
      );
    });
  });

  describe('cancelJob', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch(202);
      await client.cancelJob(jobNumber);
      expectFetch(
        HTTPMethod.Post,
        `project/${client.getProjectSlug()}/job/${jobNumber}/cancel`
      );
    });
  });

  describe('listJobArtifacts', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.listJobArtifacts(jobNumber);
      expectFetch(
        HTTPMethod.Get,
        `project/${client.getProjectSlug()}/${jobNumber}/artifacts`
      );
    });

    it('can specify a page token', async () => {
      mockFetch();
      await client.listJobArtifacts(jobNumber, { pageToken });
      expectFetch(
        HTTPMethod.Get,
        `project/${client.getProjectSlug()}/${jobNumber}/artifacts?page-token=${pageToken}`
      );
    });
  });

  describe('listJobTests', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.listJobTests(jobNumber);
      expectFetch(
        HTTPMethod.Get,
        `project/${client.getProjectSlug()}/${jobNumber}/tests`
      );
    });

    it('can specify a page token', async () => {
      mockFetch();
      await client.listJobTests(jobNumber, { pageToken });
      expectFetch(
        HTTPMethod.Get,
        `project/${client.getProjectSlug()}/${jobNumber}/tests?page-token=${pageToken}`
      );
    });
  });

  describe('getMe', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.getMe();
      expectFetch(HTTPMethod.Get, `me`);
    });
  });

  describe('getCollaborations', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.getCollaborations();
      expectFetch(HTTPMethod.Get, `me/collaborations`);
    });
  });

  describe('getUser', () => {
    it('constructs request with the correct arguments', async () => {
      const userId = 'bad-day';
      mockFetch();
      await client.getUser(userId);
      expectFetch(HTTPMethod.Get, `user/${userId}`);
    });
  });

  describe('listContexts', () => {
    const ownerId = 'bad-day';
    const ownerSlug = 'everyone-blooms';

    it('constructs a request with the correct owner-id arguments', async () => {
      mockFetch();
      await client.listContexts({
        ownerId,
        ownerType: 'account',
      });
      expectFetch(
        HTTPMethod.Get,
        `context?owner-id=${ownerId}&owner-type=account`
      );
    });

    it('constructs a request with the correct owner-slug arguments', async () => {
      mockFetch();
      await client.listContexts({
        ownerSlug,
        ownerType: 'account',
      });
      expectFetch(
        HTTPMethod.Get,
        `context?owner-slug=${ownerSlug}&owner-type=account`
      );
    });

    it('requires owner-id or owner-slug arguments', async () => {
      try {
        await client.listContexts({});
      } catch (error) {
        expect(error).toBeInstanceOf(ArgumentError);
      }
    });

    it('cannot have owner-id and owner-slug arguments', async () => {
      try {
        await client.listContexts({ ownerId, ownerSlug });
      } catch (error) {
        expect(error).toBeInstanceOf(ArgumentError);
      }
    });

    it('can specify a page token', async () => {
      mockFetch();
      await client.listContexts({
        pageToken,
        ownerSlug,
        ownerType: 'account',
      });
      expectFetch(
        HTTPMethod.Get,
        `context?page-token=${pageToken}&owner-slug=${ownerSlug}&owner-type=account`
      );
    });
  });

  describe('createContext', () => {
    it('constructs request with the correct arguments', async () => {
      const contextName = 'fairbanks-alaska';
      const ownerId = 'persona-non-grata';
      mockFetch(200);
      await client.createContext(contextName, {
        id: ownerId,
        type: 'organization',
      });
      expectFetch(HTTPMethod.Post, `context`, {
        name: contextName,
        owner: { id: ownerId, type: 'organization' },
      });
    });
  });

  describe('deleteContext', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.deleteContext(contextId);
      expectFetch(HTTPMethod.Delete, `context/${contextId}`);
    });
  });

  describe('getContext', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.getContext(contextId);
      expectFetch(HTTPMethod.Get, `context/${contextId}`);
    });
  });

  describe('listContextEnvVars', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.listContextEnvVars(contextId);
      expectFetch(HTTPMethod.Get, `context/${contextId}/environment-variable`);
    });

    it('can specify a page token', async () => {
      mockFetch();
      await client.listContextEnvVars(contextId, {
        pageToken,
      });
      expectFetch(
        HTTPMethod.Get,
        `context/${contextId}/environment-variable?page-token=${pageToken}`
      );
    });
  });

  describe('createContextEnvVar', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.createContextEnvVar(contextId, envVarName, envVarValue);
      expectFetch(
        HTTPMethod.Put,
        `context/${contextId}/environment-variable/${envVarName}`,
        { value: envVarValue }
      );
    });
  });

  describe('deleteContextEnvVar', () => {
    it('constructs request with the correct arguments', async () => {
      mockFetch();
      await client.deleteContextEnvVar(contextId, envVarName);
      expectFetch(
        HTTPMethod.Delete,
        `context/${contextId}/environment-variable/${envVarName}`
      );
    });
  });
});
