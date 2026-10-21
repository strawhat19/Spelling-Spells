import { scriptureColumns } from './scripture';
import './styles.scss';

const SpellParchmentMarquees = () => (
  <div id='spell-parchment-marquees' className='spell-parchment-marquees' aria-hidden='true'>
    {scriptureColumns.map((rows, columnIndex) => {
      const side = columnIndex === 0 ? `left` : `right`;
      const columnId = `spell-parchment-${side}`;
      return (
        <div key={side} id={columnId} className={`spell-parchment spell-parchment--${side}`}>
          <div id={`${columnId}-window`} className='spell-parchment-window'>
            <div id={`${columnId}-track`} className='spell-parchment-track'>
              {[0, 1].map((copy) => (
                <div key={copy} id={`${columnId}-group-${copy}`} className='spell-parchment-group'>
                  <svg
                    focusable='false'
                    viewBox='0 0 80 1440'
                    preserveAspectRatio='none'
                    className='spell-parchment-scripture'
                    id={`${columnId}-scripture-${copy}`}
                  >
                    {rows.map((sigil, rowIndex) => (
                      <g
                        key={rowIndex}
                        className='spell-parchment-sigil'
                        id={`${columnId}-${copy}-sigil-${rowIndex}`}
                        transform={`translate(15 ${rowIndex * 120 + 30}) scale(.833 .75)`}
                      >
                        {sigil.ink.map((shape, shapeIndex) => (
                          <path
                            d={shape}
                            key={shapeIndex}
                            fillRule='evenodd'
                            className='spell-parchment-sigil-ink'
                            id={`${columnId}-${copy}-sigil-${rowIndex}-ink-${shapeIndex}`}
                          />
                        ))}
                        <path d={sigil.details} className='spell-parchment-sigil-detail' id={`${columnId}-${copy}-sigil-${rowIndex}-detail`} />
                      </g>
                    ))}
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

export default SpellParchmentMarquees;
