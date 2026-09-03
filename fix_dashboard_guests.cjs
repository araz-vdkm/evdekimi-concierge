const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const enrichLogic = `
  const enrichedGuests = useMemo(() => {
    const groups: Record<string, any[]> = {};
    guests.forEach(g => {
      const key = (g as any).bookingId || \`\${g.unitName}_\${g.checkInDate}\`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    Object.values(groups).forEach(group => {
      group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      group.forEach((g, idx) => {
        g.isMaster = idx === 0;
        g.aliasRole = idx === 0 ? 'Master' : 'Alias';
      });
    });

    return guests.map(g => {
      let age = '—';
      if (g.dob) {
        let birthDate;
        if (g.dob.includes('.')) {
          const parts = g.dob.split('.');
          if (parts.length === 3) birthDate = new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
        } else if (g.dob.includes('/')) {
          const parts = g.dob.split('/');
          if (parts.length === 3) birthDate = new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
        } else {
          birthDate = new Date(g.dob);
        }
        if (birthDate && !isNaN(birthDate.getTime())) {
          const ageDifMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDifMs);
          age = String(Math.abs(ageDate.getUTCFullYear() - 1970));
        }
      }

      let duration = '—';
      if (g.checkInDate && g.checkOutDate) {
        const inD = new Date(g.checkInDate);
        const outD = new Date(g.checkOutDate);
        if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
          const diffTime = Math.abs(outD.getTime() - inD.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          duration = \`\${diffDays} night\${diffDays !== 1 ? 's' : ''}\`;
        }
      }

      return {
        ...g,
        calculatedAge: age,
        durationOfStay: duration,
        aliasRole: (g as any).aliasRole || 'Master'
      };
    });
  }, [guests]);

  const filteredGuests = enrichedGuests.filter(g => 
`;

content = content.replace(
  "  const filteredGuests = guests.filter(g => ",
  enrichLogic
);

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
