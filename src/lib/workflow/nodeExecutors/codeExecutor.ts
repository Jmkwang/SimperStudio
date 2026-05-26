import { WorkflowNode as _WorkflowNode, WorkflowCodeNodeData } from '../../../types/models';
import { NodeExecutorFn } from '../types';

/** Create an inline Web Worker for isolated JS execution */
function createCodeWorker(): Worker {
  const workerCode = `
    self.onmessage = async function(e) {
      const { code, payload, id } = e.data;
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('payload', code);
        const result = await fn(payload);
        self.postMessage({ id, success: true, result });
      } catch(err) {
        self.postMessage({ id, success: false, error: err.message });
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

let workerIdCounter = 0;
const activeWorkers = new Map<number, Worker>();

function executeInWorker(code: string, payload: any, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++workerIdCounter;
    const worker = createCodeWorker();
    activeWorkers.set(id, worker);

    const timer = setTimeout(() => {
      worker.terminate();
      activeWorkers.delete(id);
      reject(new Error('Code execution timed out after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    worker.onmessage = (e) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      worker.terminate();
      activeWorkers.delete(id);
      if (e.data.success) {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error || 'Code execution failed'));
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      activeWorkers.delete(id);
      reject(new Error(err.message || 'Worker error'));
    };

    worker.postMessage({ code, payload, id });
  });
}

export const codeExecute: NodeExecutorFn = async (node, payload, _helpers) => {
  const data = node.data as WorkflowCodeNodeData;
  const code = `try { ${data.code || 'return payload;'} } catch(e) { return { ...payload, _error: e.message }; }`;
  try {
    const resultPayload = await executeInWorker(code, structuredClone(payload), 10000);
    return resultPayload || payload;
  } catch (e: any) {
    return { ...payload, _error: e.message || 'Code execution failed' };
  }
};
