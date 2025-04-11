import React from "react";
import { Pagination as NextPagination } from "@nextui-org/react";

export const Pagination = ({ total, page, size, onChange }: any) => {
  console.log("Pagination", page);
  return (
    <NextPagination
      isCompact
      showControls
      showShadow
      color="primary"
      total={total}
      initialPage={1}
      page={page}
      onChange={onChange}
    />
  );
};
