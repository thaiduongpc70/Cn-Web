const recipeProcessSteps = [
  'Pha trà',
  'Pha sữa',
  'Nấu đường',
  'Pha vị',
  'Thêm topping',
  'Xay nền',
  'Phủ kem',
  'Đóng gói',
  'Chọn ly theo size',
  'Định lượng topping'
];

const packagingLines = [
  { variant: 'M', material_code: 'PKG-CUP-M', step_name: 'Chọn ly theo size', step_order: 80, quantity: 1, loss_percent: 0, note: 'Ly size M' },
  { variant: 'L', material_code: 'PKG-CUP-L', step_name: 'Chọn ly theo size', step_order: 80, quantity: 1, loss_percent: 0, note: 'Ly size L' },
  { variant: 'XL', material_code: 'PKG-CUP-XL', step_name: 'Chọn ly theo size', step_order: 80, quantity: 1, loss_percent: 0, note: 'Ly size XL' },
  { material_code: 'PKG-LID-001', step_name: 'Đóng gói', step_order: 90, quantity: 1, loss_percent: 0, note: 'Nắp ly' },
  { material_code: 'PKG-STRAW-001', step_name: 'Đóng gói', step_order: 91, quantity: 1, loss_percent: 0, note: 'Ống hút' }
];

const recipeTemplates = [
  {
    id: 'milk-tea-basic',
    name: 'Trà sữa cơ bản',
    description: 'Nền trà, bột sữa và vật tư đóng gói dùng chung cho nhóm trà sữa.',
    lines: [
      { material_code: 'MAT-TEA-001', step_name: 'Pha trà', step_order: 1, quantity: 0.03, loss_percent: 3, note: 'Cốt trà nền' },
      { material_code: 'MAT-MILK-001', step_name: 'Pha sữa', step_order: 2, quantity: 0.04, loss_percent: 2, note: 'Bột sữa' },
      ...packagingLines
    ]
  },
  {
    id: 'brown-sugar-milk',
    name: 'Sữa tươi đường đen',
    description: 'Sữa tươi, trân châu, đường đen và vật tư đóng gói.',
    lines: [
      { material_code: 'MAT-MILK-002', step_name: 'Pha sữa', step_order: 1, quantity: 0.18, loss_percent: 2, note: 'Sữa tươi' },
      { material_code: 'MAT-TOP-001', step_name: 'Thêm topping', step_order: 2, quantity: 0.05, loss_percent: 2, note: 'Trân châu nền' },
      { material_code: 'MAT-SWEET-001', step_name: 'Nấu đường', step_order: 3, quantity: 0.03, loss_percent: 2, note: 'Đường đen' },
      ...packagingLines
    ]
  },
  {
    id: 'fruit-tea',
    name: 'Trà trái cây',
    description: 'Nền trà và một nguyên liệu trái cây mẫu, có thể sửa lại sau khi tạo.',
    lines: [
      { material_code: 'MAT-TEA-001', step_name: 'Pha trà', step_order: 1, quantity: 0.025, loss_percent: 3, note: 'Cốt trà nền' },
      { material_code: 'MAT-FRU-001', step_name: 'Pha vị', step_order: 2, quantity: 0.08, loss_percent: 0, note: 'Trái cây mẫu' },
      ...packagingLines
    ]
  },
  {
    id: 'ice-blended',
    name: 'Đá xay',
    description: 'Bột vị, sữa, kem phủ và vật tư đóng gói.',
    lines: [
      { material_code: 'MAT-POW-001', step_name: 'Xay nền', step_order: 1, quantity: 0.03, loss_percent: 4, note: 'Bột vị mẫu' },
      { material_code: 'MAT-MILK-001', step_name: 'Pha sữa', step_order: 2, quantity: 0.04, loss_percent: 2, note: 'Bột sữa' },
      { material_code: 'MAT-CREAM-001', step_name: 'Phủ kem', step_order: 3, quantity: 0.03, loss_percent: 3, note: 'Kem phủ' },
      ...packagingLines
    ]
  },
  {
    id: 'topping-boba',
    name: 'Topping trân châu',
    description: 'Một phần topping bán thêm.',
    lines: [
      { material_code: 'MAT-TOP-001', step_name: 'Định lượng topping', step_order: 1, quantity: 0.08, loss_percent: 2, note: 'Một phần topping' }
    ]
  }
];

module.exports = {
  recipeProcessSteps,
  recipeTemplates
};
