import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type HandrailApi } from '@shared/ipc'

const api: HandrailApi = {
  openRepository: () => ipcRenderer.invoke(IPC.openRepository),
  getStatus: (root) => ipcRenderer.invoke(IPC.getStatus, root),
  getLog: (root, limit) => ipcRenderer.invoke(IPC.getLog, root, limit),
  previewAction: (root, request) => ipcRenderer.invoke(IPC.previewAction, root, request),
  runAction: (root, request) => ipcRenderer.invoke(IPC.runAction, root, request),
  undoOperation: (root, id) => ipcRenderer.invoke(IPC.undoOperation, root, id),
  listOperations: (root) => ipcRenderer.invoke(IPC.listOperations, root)
}

contextBridge.exposeInMainWorld('handrail', api)
