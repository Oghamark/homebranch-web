import {useDispatch, useSelector} from "react-redux";
import type {AppDispatch, RootState} from "@/app/store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();