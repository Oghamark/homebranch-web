import {useEffect, useRef, useState} from "react";
import {Button, Flex, Heading, HStack, Input, NativeSelect, Stack, Text} from "@chakra-ui/react";
import {LuArrowDown, LuArrowUp, LuPlus} from "react-icons/lu";
import {type BookClubSchedule, type MilestoneKind, usePatchBookClubScheduleMutation} from "@/entities/bookClub";
import {ConfirmAction} from "./ClubUI";

type DraftStep = {key: string; id?: string; name: string; kind: MilestoneKind};

export function readingPlanPayload(schedule: BookClubSchedule, startDate: string, completionDate: string, steps: DraftStep[]) {
    const milestones = steps.map(({id, name, kind}, index) => ({...(id ? {id} : {}), name: name.trim(), kind, position: index + 1}));
    const old = schedule.milestones.map(({id, name, kind, position}) => ({id, name, kind, position}));
    return {startDate: startDate || null, completionDate: completionDate || null,
        ...(JSON.stringify(old) === JSON.stringify(milestones) ? {} : {milestones})};
}

export function ReadingPlanEditor({clubId, schedule, onSaved}: {clubId: string; schedule: BookClubSchedule; onSaved: () => void}) {
    const [start, setStart] = useState(schedule.startDate ?? "");
    const [completion, setCompletion] = useState(schedule.completionDate ?? "");
    const [steps, setSteps] = useState<DraftStep[]>(() => schedule.milestones.map(step => ({...step, key: step.id})));
    const dirty = useRef(false);
    const [save, state] = usePatchBookClubScheduleMutation();
    useEffect(() => {
        if (!dirty.current) {
            setStart(schedule.startDate ?? ""); setCompletion(schedule.completionDate ?? "");
            setSteps(schedule.milestones.map(step => ({...step, key: step.id})));
        }
    }, [schedule]);
    const changeSteps = (next: DraftStep[]) => {dirty.current = true; setSteps(next);};
    const removed = schedule.milestones.filter(step => !steps.some(draft => draft.id === step.id));
    const valid = steps.every(step => !!step.name.trim() && step.name.trim().length <= 120) && steps.length <= 100 && !(start && completion && start > completion);
    const submit = async () => {
        if (!valid) throw new Error("Check the reading plan fields.");
        await save({clubId, ...readingPlanPayload(schedule, start, completion, steps)}).unwrap();
        dirty.current = false; onSaved();
    };
    return <Stack as="form" gap={5} p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" bg="bg.muted"
        onSubmit={e => {e.preventDefault(); if (!removed.length) void submit().catch(() => {/* The mutation error is displayed below. */});}}>
        <Heading size="lg" fontFamily="Georgia, serif">Make room for a good read</Heading>
        <Text fontSize="sm" color="fg.muted">Add a few chapters, parts, or checkpoints. Editing or reordering a step keeps everyone's existing progress and private labels.</Text>
        <Flex gap={4} wrap="wrap"><Stack flex="1" minW="180px" gap={2}><label htmlFor="plan-start">Start date (optional)</label><Input id="plan-start" type="date" value={start} onChange={e => {dirty.current = true; setStart(e.target.value);}}/></Stack>
            <Stack flex="1" minW="180px" gap={2}><label htmlFor="plan-finish">Finish date (optional)</label><Input id="plan-finish" type="date" value={completion} onChange={e => {dirty.current = true; setCompletion(e.target.value);}}/></Stack></Flex>
        {start && completion && start > completion && <Text role="alert" color="fg.error">Choose a finish date on or after the start date.</Text>}
        <Stack gap={3}>{steps.map((step, index) => <Stack key={step.key} borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel" gap={3}>
            <HStack justify="space-between"><Text fontSize="sm" color="fg.muted">Step {index + 1}</Text>
                <HStack gap={1}><Button variant="ghost" minW="44px" minH="44px" aria-label={`Move step ${index + 1} up`} disabled={index === 0 || state.isLoading} onClick={() => {
                    const next = [...steps]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; changeSteps(next);
                }}><LuArrowUp/></Button><Button variant="ghost" minW="44px" minH="44px" aria-label={`Move step ${index + 1} down`} disabled={index === steps.length - 1 || state.isLoading} onClick={() => {
                    const next = [...steps]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; changeSteps(next);
                }}><LuArrowDown/></Button></HStack></HStack>
            <label htmlFor={`step-name-${step.key}`}>Step name</label><Input id={`step-name-${step.key}`} value={step.name} required maxLength={120} disabled={state.isLoading} placeholder="For example, Chapters 1 to 4"
                onChange={e => changeSteps(steps.map(item => item.key === step.key ? {...item, name: e.target.value} : item))}/>
            <Flex gap={3} wrap="wrap" align="end"><Stack gap={2} flex="1"><label htmlFor={`step-kind-${step.key}`}>Type</label><NativeSelect.Root disabled={state.isLoading}><NativeSelect.Field id={`step-kind-${step.key}`} value={step.kind} onChange={e => {
                const kind = e.target.value;
                if (kind === "part" || kind === "chapter" || kind === "checkpoint") changeSteps(steps.map(item => item.key === step.key ? {...item, kind} : item));
            }}><option value="chapter">Chapter</option><option value="part">Part</option><option value="checkpoint">Checkpoint</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Stack>
                <Button variant="ghost" minH="44px" disabled={state.isLoading} onClick={() => changeSteps(steps.filter(item => item.key !== step.key))}>Remove step {index + 1}</Button></Flex>
        </Stack>)}</Stack>
        <Button alignSelf="start" variant="outline" minH="44px" disabled={steps.length >= 100 || state.isLoading} onClick={() => changeSteps([...steps, {key: crypto.randomUUID(), name: "", kind: "chapter"}])}><LuPlus/> Add reading step</Button>
        {!!removed.length && <Text role="status" fontSize="sm" color="fg.error">{removed.length} {removed.length === 1 ? "step will" : "steps will"} be removed when you save, along with progress and private labels for those steps only.</Text>}
        {state.error && <Text role="alert" color="fg.error">Your reading plan couldn't be saved. A step may have changed since you opened it. Your draft is still here; check your connection or reopen the editor to load the latest plan.</Text>}
        {!valid && <Text color="fg.error" fontSize="sm">Give each step a name and check your dates before saving.</Text>}
        <HStack alignSelf="start">{removed.length ? <ConfirmAction title="Remove reading steps?" description={`Saving will remove ${removed.map(step => step.name).join(", ")} and everyone's club progress and private labels for those steps. Other steps and private reading history are unchanged.`}
            actionLabel="Save reading plan" destructive disabled={!valid || state.isLoading} onConfirm={submit}/> : <Button type="submit" minH="44px" colorPalette="orange" disabled={!valid} loading={state.isLoading}>Save reading plan</Button>}</HStack>
    </Stack>;
}
