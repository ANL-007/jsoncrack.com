import React, { useEffect, useState } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  Button,
  CloseButton,
  TextInput,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import useJson from "../../../store/useJson";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useFile from "../../../store/useFile";

const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return obj;
};

const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const jsonStore = useJson();
  const graphStore = useGraph();

  const editableFields = normalizeNodeData(nodeData?.text ?? []);
  const jsonPath = jsonPathToString(nodeData?.path);

  const [editMode, setEditMode] = useState(false);
  const [editableValues, setEditableValues] = useState({});

  // Initialize editableValues when nodeData changes
  useEffect(() => {
    setEditableValues(editableFields);
  }, [nodeData]);

  const enterEditMode = () => {
    setEditableValues(editableFields);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditableValues(editableFields);
    setEditMode(false);
  };

  const handleClose = () => {
    cancelEdit();
    onClose();
  };

  const setContents = useFile(state => state.setContents);

  const saveChanges = () => {
    if (!nodeData || !nodeData.path) return;

    const currentJson = useJson.getState().getJson();
    const parsed = JSON.parse(currentJson);

    let ref = parsed;
    const path = nodeData.path;
    for (let i = 0; i < path.length - 1; i++) {
      if (ref[path[i]] === undefined) return;
      ref = ref[path[i]];
    }

    const lastKey = path[path.length - 1];
    Object.entries(editableValues).forEach(([key, value]) => {
      ref[lastKey][key] = value;
    });

    const updatedJson = JSON.stringify(parsed, null, 2);

    // Update graph + editor
    useJson.getState().setJson(updatedJson);
    setContents({ contents: updatedJson, skipUpdate: false });

    // NEW: refresh the selected node in the graph
    graphStore.setGraph(updatedJson);
    graphStore.refreshSelectedNode();

    setEditMode(false);
  };

  return (
    <Modal size="auto" opened={opened} onClose={handleClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Flex justify="space-between" align="center">
          <Text fz="xs" fw={500}>
            {editMode ? "Edit Node" : "Content"}
          </Text>
          <Flex gap="xs" align="center">
            {/* Show Edit button when not editing */}
            {!editMode && (
              <Button
                size="xs"
                color="blue"
                onClick={enterEditMode}
                aria-label="Edit node"
              >
                Edit
              </Button>
            )}

            {/* When editing, show Cancel (red) and Save (green) */}
            {editMode && (
              <>
                <Button size="xs" color="green" onClick={saveChanges} aria-label="Save changes">
                  Save
                </Button>
                <Button size="xs" color="red" variant="outline" onClick={cancelEdit} aria-label="Cancel edits">
                  Cancel
                </Button>
              </>
            )}

            {/* Close (X) button */}
            <CloseButton onClick={handleClose} aria-label="Close node modal" size="sm" />
          </Flex>
        </Flex>

        {/* READ MODE */}
        {!editMode && (
          <>
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={JSON.stringify(editableFields, null, 2)}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>

            <Text fz="xs" fw={500}>
              JSON Path
            </Text>
            <ScrollArea.Autosize mah={100} maw={600}>
              <CodeHighlight code={jsonPath} miw={350} language="json" withCopyButton />
            </ScrollArea.Autosize>
          </>
        )}

        {/* EDIT MODE */}
        {editMode && (
          <Stack>
            {Object.entries(editableValues).map(([key, value]) => (
              <TextInput
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={value as string}
                onChange={e =>
                  setEditableValues(prev => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
              />
            ))}

            {/* Read-only JSON Path with highlight */}
            <Text fz="xs" fw={500}>
              JSON Path
            </Text>
            <ScrollArea.Autosize mah={100} maw={600}>
              <CodeHighlight code={jsonPath} miw={350} language="json" withCopyButton />
            </ScrollArea.Autosize>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
};
