// src/components/scraping/Credentials.jsx
export default function Credentials({ email, password, handleInputChange }) {
  return (
    <>
      <div>
        <label className="block font-medium">Email</label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Password</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
      </div>
    </>
  );
}
