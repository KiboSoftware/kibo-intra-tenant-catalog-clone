type ActionStatus = 'pending' | 'success' | 'failed' | 'skipped';

interface Action {
  id: string;
  type: string;
  status: ActionStatus;
  data: any;
  documentListName?: string;
  error?: Error;
}

interface Summary {
  total: number;
  success: number;
  failed: number;
  pending: number;
  skipped: number;
}

class ActionTracker {
  private actions: Map<string, Action> = new Map();
  addAction(id: string, type: string, documentListName: string, data?: any) {
    this.actions.set(id, {
      id,
      type,
      documentListName,
      status: 'pending',
      data: data,
    });
  }
  markSuccess(id: string) {
    const action = this.actions.get(id);
    if (action) {
      action.status = 'success';
    }
  }
  markFailed(id: string, error: Error) {
    const action = this.actions.get(id);
    if (action) {
      action.status = 'failed';
      action.error = error;
    }
  }
  getAction(id: string): Action | undefined {
    return this.actions.get(id);
  }
  generateReport(): Summary {
    let total = 0;
    let success = 0;
    let failed = 0;
    let pending = 0;
    let skipped = 0;
    this.actions.forEach((action) => {
      total++;
      if (action.status === 'success') success++;
      if (action.status === 'failed') failed++;
      if (action.status === 'pending') pending++;
      if (action.status === 'skipped') skipped++;
    });

    return {
      total,
      success,
      failed,
      pending,
      skipped,
    };
  }
}

const actionTracker = new ActionTracker();
export default actionTracker;
