const BrandLogo = ({ size = 60 }: { size?: number }) => (
  <img
    alt=''
    width={size}
    height={size}
    aria-hidden='true'
    className='brand-logo-mark'
    src='/brand/logo-mark.svg'
  />
);

export default BrandLogo;
