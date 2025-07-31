// src/components/scraping/KeywordsInput.jsx
export default function KeywordsInput({ keywords, handleInputChange }) {
  return (
    <div>
      <label className="block font-medium">Keywords (comma-separated)</label>
      <input
        type="text"
        name="keywords"
        value={keywords}
        onChange={handleInputChange}
        required
        className="w-full p-2 border rounded"
      />
    </div>
  );
}
