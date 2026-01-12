export type Tenant = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

export type Project = {
  id: string;
  name: string;
  location: string;
  targetSell: number;
  flats: { id: string; name: string; size: number, status: 'available' | 'sold' }[];
  startDate: string;
  status: 'Ongoing' | 'Upcoming' | 'Completed';
  expectedHandoverDate: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
};

export type Sale = {
  id: string;
  projectId: string;
  flatId: string;
  customerId: string;
  amount: number;
  perSftPrice: number;
  parkingPrice: number;
  utilityCost: number;
  note: string;
  deedLink: string;
  bookingMoney: number;
  monthlyInstallment: number;
};

export type Payment = {
    id: string;
    saleId: string;
    amount: number;
    type: 'Cash' | 'Cheque' | 'Bank Transfer';
    reference: string;
    paymentDate: string;
};

export const tenants: Tenant[] = [
  { id: 'propertyman', name: 'PropertyMan Inc.', status: 'active' },
  { id: 'realhomes', name: 'RealHomes Ltd.', status: 'active' },
  { id: 'citybuilders', name: 'City Builders Co.', status: 'inactive' },
];

export const projects: Project[] = [
  {
    id: 'proj-001',
    name: 'Azure Heights',
    location: 'Gulshan, Dhaka',
    targetSell: 500000000,
    flats: [
      { id: 'f-1', name: '2A', size: 1500, status: 'sold' },
      { id: 'f-2', name: '2B', size: 1600, status: 'available' },
      { id: 'f-3', name: '3A', size: 1550, status: 'available' },
    ],
    startDate: '2022-01-15',
    status: 'Ongoing',
    expectedHandoverDate: '2025-12-31',
  },
  {
    id: 'proj-002',
    name: 'Greenfield Oasis',
    location: 'Dhanmondi, Dhaka',
    targetSell: 750000000,
     flats: [
      { id: 'f-4', name: 'A1', size: 2200, status: 'available' },
      { id: 'f-5', name: 'B2', size: 2500, status: 'available' },
    ],
    startDate: '2023-06-01',
    status: 'Upcoming',
    expectedHandoverDate: '2026-06-30',
  },
    {
    id: 'proj-003',
    name: 'Prime Towers',
    location: 'Banani, Dhaka',
    targetSell: 1200000000,
     flats: [
      { id: 'f-6', name: '10A', size: 3000, status: 'sold' },
      { id: 'f-7', name: '10B', size: 3100, status: 'sold' },
    ],
    startDate: '2020-01-01',
    status: 'Completed',
    expectedHandoverDate: '2023-12-31',
  },
];

export const customers: Customer[] = [
  { id: 'cust-001', name: 'Mr. Karim', phone: '01700000001', address: 'House 1, Road 2, Block B, Dhaka' },
  { id: 'cust-002', name: 'Ms. Rahima', phone: '01800000002', address: 'Apt 5, Building 3, Sector 4, Dhaka' },
  { id: 'cust-003', name: 'Mr. John Doe', phone: '01900000003', address: '123 Main Street, Dhaka' },
];

export const sales: Sale[] = [
    {
        id: 'sale-001',
        projectId: 'proj-001',
        flatId: 'f-1',
        customerId: 'cust-001',
        amount: 15000000,
        perSftPrice: 10000,
        parkingPrice: 500000,
        utilityCost: 200000,
        note: 'Corner plot view.',
        deedLink: 'https://example.com/deed/1',
        bookingMoney: 2000000,
        monthlyInstallment: 100000,
    },
    {
        id: 'sale-002',
        projectId: 'proj-003',
        flatId: 'f-6',
        customerId: 'cust-002',
        amount: 30000000,
        perSftPrice: 10000,
        parkingPrice: 700000,
        utilityCost: 300000,
        note: 'Penthouse with roof garden.',
        deedLink: 'https://example.com/deed/2',
        bookingMoney: 5000000,
        monthlyInstallment: 250000,
    }
];

export const payments: (Payment & { customerId: string, projectId: string, flatId: string })[] = [
    {
        id: 'pay-001',
        saleId: 'sale-001',
        customerId: 'cust-001',
        projectId: 'proj-001',
        flatId: 'f-1',
        amount: 2000000,
        type: 'Bank Transfer',
        reference: 'TRF-12345',
        paymentDate: '2023-01-20',
    },
    {
        id: 'pay-002',
        saleId: 'sale-001',
        customerId: 'cust-001',
        projectId: 'proj-001',
        flatId: 'f-1',
        amount: 100000,
        type: 'Cash',
        reference: 'N/A',
        paymentDate: '2023-02-15',
    },
    {
        id: 'pay-003',
        saleId: 'sale-002',
        customerId: 'cust-002',
        projectId: 'proj-003',
        flatId: 'f-6',
        amount: 5000000,
        type: 'Cheque',
        reference: 'CHK-98765',
        paymentDate: '2023-03-01',
    },
];

export const organization = {
    name: 'Your Company Name',
    logoUrl: 'https://picsum.photos/seed/102/200/60',
    website: 'https://yourcompany.com',
    address: '123 Business Avenue, Suite 100, Dhaka, Bangladesh',
    phone: '+880 1234 567890',
    email: 'contact@yourcompany.com'
}
