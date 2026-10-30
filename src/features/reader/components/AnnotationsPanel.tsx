import {useState} from "react";
import {Box, Button, Flex, IconButton, Input, Stack, Text, Textarea} from "@chakra-ui/react";
import {LuHighlighter} from "react-icons/lu";
import type {Annotation, AnnotationAnchor, AnnotationMutation} from "@/features/koreader/api";
import {annotationColors, annotationPalette} from "../utils/annotationCodec";
import {annotationId} from "@/features/koreader/annotationId";
import type {ThemeColors} from "../types/ReaderTheme";
import {ReaderDialog, readerSurface} from "./ReaderUI";

interface Props {
    colors: ThemeColors;
    epubFormatId?: string;
    items: Annotation[];
    selection: AnnotationAnchor | null;
    resolution: Record<string, string>;
    pending: number;
    syncing: boolean;
    error: string;
    mutate: (id: string, body: Omit<AnnotationMutation, "mutationId">) => boolean;
    refresh: () => Promise<void>;
    clearSelection: () => void;
    jump: (item: Annotation) => void;
    buttonVisible?: boolean;
}
function AnnotationEditor({item, mutate, close, removed}: {item: Annotation; mutate: Props["mutate"]; close: () => void; removed: boolean}) {
    const [note, setNote] = useState(item.note);
    const [color, setColor] = useState(item.color);
    return <Stack gap={2}>
        <label>Note<Textarea value={note} maxLength={20000} onChange={e => setNote(e.target.value)}/></label>
        <label>Highlight color<select aria-label="Highlight color" value={color} onChange={e => setColor(e.target.value)}>
            {!Object.values(annotationPalette).includes(color as typeof annotationPalette[keyof typeof annotationPalette]) && <option value={color}>{color} (original)</option>}
            {annotationColors.map(value => <option key={value} value={annotationPalette[value]}>{value}</option>)}
        </select></label>
        {removed && <Text role="alert">This annotation was removed remotely. Saving your draft will restore it as a new accepted edit.</Text>}
        <Flex gap={2} wrap="wrap"><Button onClick={() => { if (mutate(item.id, {quote: item.quote, note, color, anchor: item.anchor, ...(removed ? {deleted: false} : {})})) close(); }}>Save note and style</Button>
            <Button variant="outline" onClick={close}>Cancel edit</Button></Flex>
    </Stack>;
}
export function AnnotationsPanel(props: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Annotation | null>(null);
    const [note, setNote] = useState("");
    const label = `Private annotations${props.pending > 0 ? ` (${props.pending} pending)` : ""}${props.selection ? " + selection" : ""}`;
    return <>
        {props.buttonVisible !== false && <Box position="fixed" top={2} right="112px" zIndex={1002} {...readerSurface(props.colors)} borderRadius="lg">
            <IconButton aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open}
                onClick={() => setOpen(true)} position="relative" borderRadius="lg" minW="44px" minH="44px"
                bg={props.colors.btnBg} color={props.colors.text} boxShadow="md" _hover={{bg: props.colors.btnHoverBg}}>
                <LuHighlighter/>
                {(props.pending > 0 || !!props.selection || !!props.error) && <Box as="span" aria-hidden="true"
                    position="absolute" top="4px" right="4px" boxSize="6px" borderRadius="full" bg={props.colors.text}/>}
            </IconButton>
        </Box>}
        <ReaderDialog open={open} onClose={() => setOpen(false)} title="Private EPUB annotations" colors={props.colors}>
        <Stack gap={3}>
            {props.epubFormatId && <Box>
                <label>EPUB format ID for manual linking<Input readOnly value={props.epubFormatId} onFocus={event => event.target.select()}/></label>
                <Text fontSize="sm">Use this if the plugin asks which identical-content edition to link. The server still verifies your EPUB content and access.</Text>
            </Box>}
            <Text role="status">{props.syncing ? "Syncing annotations..." : props.pending ? `${props.pending} pending changes` : "No pending changes"}</Text>
            {props.error && <Text role="alert">{props.error}</Text>}
            <Button variant="outline" disabled={props.syncing} onClick={() => void props.refresh()}>Retry / refresh annotations</Button>
            {props.selection ? <Stack borderWidth="1px" p={3}>
                <Text>Selected quote: {props.selection.exact}</Text>
                <label>New annotation note<Input value={note} onChange={e => setNote(e.target.value)} maxLength={20000}/></label>
                <Button onClick={() => {
                    if (props.mutate(annotationId(), {quote: props.selection!.exact, note, color: annotationPalette.yellow, anchor: props.selection!})) {
                        props.clearSelection(); setNote("");
                    }
                }}>Highlight selected text</Button>
                <Button variant="outline" onClick={props.clearSelection}>Discard selection</Button>
            </Stack> : <Text>Select text in the EPUB to create a highlight. Repeated or ambiguous quotes cannot be attached without unique context.</Text>}
            {!props.items.length && <Text>No annotations.</Text>}
            {editing && <Stack borderWidth="1px" p={3}>
                <Text>Editing: {editing.quote}</Text>
                <AnnotationEditor key={editing.id} item={editing} mutate={props.mutate} close={() => setEditing(null)} removed={!props.items.some(item => item.id === editing.id)}/>
            </Stack>}
            {props.items.map(item => <Stack key={item.id} borderWidth="1px" p={3} gap={2}>
                <Text whiteSpace="pre-wrap">{item.quote}</Text>
                <Text fontSize="sm">{props.resolution[item.id] ?? "Unresolved: not checked in an open chapter"}</Text>
                {editing?.id === item.id ? <Text>Editing above</Text> : <>
                    <Text whiteSpace="pre-wrap">{item.note || "No note"}</Text>
                    <Text fontSize="sm">Color: {item.color}</Text>
                    <Button variant="outline" disabled={!!editing} onClick={() => setEditing(item)}>Edit note / style</Button>
                </>}
                <Flex gap={2} wrap="wrap">
                    <Button variant="outline" disabled={!item.anchor.href} onClick={() => props.jump(item)}>Open chapter / show quote</Button>
                    <Button variant="outline" onClick={() => {
                        if (props.mutate(item.id, {quote: item.quote, note: item.note, color: item.color, anchor: item.anchor, deleted: true})) setEditing(null);
                    }}>Delete annotation</Button>
                </Flex>
            </Stack>)}
        </Stack>
        </ReaderDialog>
    </>;
}
