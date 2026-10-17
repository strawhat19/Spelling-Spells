import './styles.scss';
import type { SkeletonProps } from './types';

const Skeleton = ({ id, width = `100%`, height = 12, shape = `line`, className = `` }: SkeletonProps) => <span
  id={id}
  aria-hidden='true'
  style={{ width, height }}
  className={`skeleton skeleton-${shape}${className ? ` ${className}` : ``}`}
/>;

export default Skeleton;
