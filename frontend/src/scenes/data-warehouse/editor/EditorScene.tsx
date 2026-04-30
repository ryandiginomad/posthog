import './EditorScene.scss'

import { useActions } from 'kea'

import { SceneExport } from 'scenes/sceneTypes'

import { editorSceneLogic } from './editorSceneLogic'
import { SQLEditor } from './SQLEditor'
import { SQLEditorMode } from './sqlEditorModes'

export const scene: SceneExport = {
    logic: editorSceneLogic,
    component: EditorScene,
}

export function EditorScene({ tabId }: { tabId?: string }): JSX.Element {
    const resolvedTabId = tabId ?? 'default'
    const { shareTab } = useActions(editorSceneLogic({ tabId: resolvedTabId }))

    return (
        <SQLEditor tabId={resolvedTabId} mode={SQLEditorMode.FullScene} showDatabaseTree={true} onShareTab={shareTab} />
    )
}
