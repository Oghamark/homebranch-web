import { FileUpload, type ButtonProps } from "@chakra-ui/react";
import { HiPlus } from "react-icons/hi";
import { type ChangeEvent, useEffect } from "react";
import SubmitButton from "@/components/ui/SubmitButton";
import { toaster } from "@/components/ui/toaster";
import { useFetcher } from "react-router";

export function AddBookButton(buttonProps : ButtonProps) {
  const fetcher = useFetcher();

  const _handleSubmit = async (event: ChangeEvent<HTMLInputElement>) => {
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append("files", files[0]);
    
    fetcher.submit(formData, {
      method: "POST",
      action: "/create-book",
      encType: "multipart/form-data",
    });

    event.target.value = '';
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        toaster.create({
          title: "Book added successfully!",
          type: "success",
        });
      } else {
        toaster.create({
          title: "Failed to add book",
          type: "error",
        });
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <FileUpload.Root>
      <FileUpload.HiddenInput onChange={_handleSubmit} accept=".epub" />
      <FileUpload.Trigger asChild>
        <SubmitButton 
          variant={"outline"} 
          size="sm" 
          width={"100%"}
          loading={fetcher.state === "submitting"}
          {...buttonProps}
        >
          <HiPlus /> Add Book
        </SubmitButton>
      </FileUpload.Trigger>
    </FileUpload.Root>
  );
}