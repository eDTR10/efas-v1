import React from "react";

type FormattedMoneyProps = {
  value: number | string | undefined;
};

const FormattedMoney: React.FC<FormattedMoneyProps> = ({ value }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Ensure value is numeric and default to 0 if undefined or invalid
  const numericValue = parseFloat(value as string) || 0;

  return <>{   "₱"+ formatNumber(numericValue)}</>;
};

export default FormattedMoney;
