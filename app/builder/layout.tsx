export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <style>{`
        /* NUKES: apapun topbar/banner kuning yang kebawa dari global */
        :global(header),
        :global(.topbar),
        :global(.appTopbar),
        :global(.header),
        :global(.banner),
        :global([role="banner"]) {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        /* kalau ada wrapper yang ngasih padding top karena header */
        :global(body) {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
      `}</style>
    </>
  );
}
