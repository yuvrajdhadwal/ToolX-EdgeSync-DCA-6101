import { useState } from 'react'
import { COLORS } from '../constants/colors'

type Option = {
  id: number;
  username: string;
}

interface Props {
  options: Option[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

const MultiSelectProfessionals: React.FC<Props> = ({ options, selected, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = options.filter(
    (p) => p.username.toLowerCase().includes(searchTerm.toLowerCase()) && !selected.includes(p.id)
  );

  const add = (id: number) => { onChange([...selected, id]); setSearchTerm(''); };
  const remove = (id: number) => onChange(selected.filter((s) => s !== id));

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, minHeight: '42px', cursor: 'text' }}
        onClick={() => setDropdownOpen(true)}
      >
        {selected.map((id) => {
          const pro = options.find((p) => p.id === id);
          return (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: COLORS.backgroundSecondary, color: COLORS.textPrimary, borderRadius: '999px', padding: '3px 10px', fontSize: '12px' }}>
              {pro?.username}
              <span style={{ cursor: 'pointer', fontSize: '14px' }} onClick={(e) => { e.stopPropagation(); remove(id); }}>×</span>
            </span>
          );
        })}
        <input
          type="text"
          placeholder={selected.length === 0 ? 'Select professionals...' : ''}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          style={{ border: 'none', outline: 'none', background: 'transparent', color: COLORS.textPrimary, fontSize: '13px', minWidth: '80px', flex: 1 }}
        />
      </div>

      {dropdownOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, backgroundColor: COLORS.backgroundPrimary, border: `1px solid ${COLORS.borderPrimary}`, borderRadius: '6px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto' }}>
          {filtered.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: '13px' }}>No results</div>
            : filtered.map((pro) => (
                <div key={pro.id} onMouseDown={() => add(pro.id)}
                  style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', color: COLORS.textPrimary }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.backgroundSecondary)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  {pro.username}
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
};

export default MultiSelectProfessionals;