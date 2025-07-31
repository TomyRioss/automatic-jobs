// src/components/scraping/ScrapingForm.jsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import PlatformSelector from "./PlatformSelector";
import Credentials from "./Credentials";
import KeywordsInput from "./KeywordsInput";
import LinkedinOptions from "./LinkedinOptions";
import SubmitButton from "./SubmitButton";

export default function ScrapingForm({ addLog }) {
  const [sessionData, setSessionData] = useState({
    platform: "linkedin",
    email: "",
    password: "",
    keywords: "",
    location: "",
    modalities: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSessionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModalityChange = (e) => {
    const { value, checked } = e.target;
    setSessionData((prev) => {
      const newModalities = checked
        ? [...prev.modalities, value]
        : prev.modalities.filter((m) => m !== value);
      return { ...prev, modalities: newModalities };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    addLog(`Starting process for ${sessionData.platform}...`);

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start process.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const logs = chunk.split("\\n").filter(Boolean);
        logs.forEach(addLog);
      }

      toast.success("Scraping process completed successfully!");
    } catch (error) {
      toast.error(error.message);
      addLog(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <PlatformSelector platform={sessionData.platform} handleInputChange={handleInputChange} />
      <Credentials
        email={sessionData.email}
        password={sessionData.password}
        handleInputChange={handleInputChange}
      />
      <KeywordsInput keywords={sessionData.keywords} handleInputChange={handleInputChange} />
      {sessionData.platform === "linkedin" && (
        <LinkedinOptions
          location={sessionData.location}
          modalities={sessionData.modalities}
          handleInputChange={handleInputChange}
          handleModalityChange={handleModalityChange}
        />
      )}
      <SubmitButton isLoading={isLoading} />
    </form>
  );
}
