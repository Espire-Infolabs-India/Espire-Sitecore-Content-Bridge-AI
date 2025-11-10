"use client";
import { useState } from "react";
import { Button, IconButton, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, FormControl, FormLabel, Textarea, Stack, Box } from "@chakra-ui/react";

interface SettingsProps {
  prompt: string;
  brandWebsite: string;
  setPromptValue: (value: React.SyntheticEvent) => void;
  setBrandWebsite: (value: React.SyntheticEvent) => void;
}

const Settings: React.FC<SettingsProps> = ({prompt, brandWebsite, setPromptValue, setBrandWebsite }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  return (
    <Box textAlign="right">
      <Button colorScheme="gray" onClick={() => setModalOpen(true)}>Settings</Button>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent maxW="md">
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Prompt</FormLabel>
                <Textarea placeholder="Enter a prompt" value={prompt} onChange={setPromptValue} rows={4} />
              </FormControl>
              <FormControl>
                <FormLabel>Brand Website</FormLabel>
                <Textarea placeholder="Enter a Brand Website" value={brandWebsite} onChange={setBrandWebsite} rows={4} />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setModalOpen(false)} colorScheme="blue">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Settings;