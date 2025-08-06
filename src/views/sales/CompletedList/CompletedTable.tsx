import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { HiOutlineEye, HiRefresh, HiReceiptTax } from 'react-icons/hi';
import DataTable from '@/components/shared/DataTable';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef, DataTableResetHandle } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import Input from '@/components/ui/Input';
import { BASE_URL } from '@/constants/app.constant';

interface JobCard {
  _id: string;
  customerName: string;
  phoneNumber: string;
  jobCardNumber: string;
  InDate: string;
  OutDate: string | null;
  jobCardStatus: string;
  warranty: boolean;
  worker?: {
    _id: string;
    workerName: string;
    workerImage: string;
  };
  images: { _id: string; image: string }[] | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const CompletedTable = ({
  searchTerm,
  filters,
}: {
  searchTerm: string;
  filters: { warranty?: boolean };
}) => {
  const tableRef = useRef<DataTableResetHandle>(null);
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // Drawer state for change status
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);
  const [selectedStatusJobCardId, setSelectedStatusJobCardId] = useState<string | null>(null);

  // Drawer state for billing
  const [isBillDrawerOpen, setIsBillDrawerOpen] = useState(false);
  const [selectedBillJobCardId, setSelectedBillJobCardId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  useEffect(() => {
    setPageIndex(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    const fetchJobCards = async () => {
      setLoading(true);
      try {
        const params: any = {
          page: pageIndex,
          limit: pageSize,
          searchTerm: searchTerm ? searchTerm : '',
          completed: true, // Only fetch completed job cards
        };
        if (filters.warranty !== undefined) params.warranty = filters.warranty;

        const response = await axios.get(`${BASE_URL}/jobcards/`, { params });
        setJobCards(response.data?.data?.data);
        setTotal(response.data?.data?.countOfDocuments);
      } catch (error) {
        console.error('Error fetching job cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobCards();
  }, [pageIndex, pageSize, searchTerm, filters]);

  const openStatusDrawer = (jobCardId: string) => {
    setSelectedStatusJobCardId(jobCardId);
    setIsStatusDrawerOpen(true);
  };

  const closeStatusDrawer = () => {
    setIsStatusDrawerOpen(false);
    setSelectedStatusJobCardId(null);
  };

  const openBillDrawer = (jobCardId: string) => {
    setSelectedBillJobCardId(jobCardId);
    setIsBillDrawerOpen(true);
  };

  const closeBillDrawer = () => {
    setIsBillDrawerOpen(false);
    setSelectedBillJobCardId(null);
    setInvoiceNumber('');
  };

  const handlePendingJobCard = async () => {
    if (!selectedStatusJobCardId) return;

    try {
      await axios.put(`${BASE_URL}/jobcards/pending?id=${selectedStatusJobCardId}`);
      // Refresh job cards
      const response = await axios.get(`${BASE_URL}/jobcards/`, {
        params: { page: pageIndex, limit: pageSize, searchTerm, completed: true },
      });
      setJobCards(response.data?.data?.data);

      // Show success toast
      toast.push(
        <Notification title="Success" type="success">
          Job card marked as pending successfully.
        </Notification>
      );

      // Close the drawer
      closeStatusDrawer();
    } catch (error) {
      console.error('Error marking job card as pending:', error);
    }
  };

  const handleReturnJobCard = async () => {
    if (!selectedStatusJobCardId) return;

    try {
      await axios.put(`${BASE_URL}/jobcards/return?id=${selectedStatusJobCardId}`);
      // Refresh job cards
      const response = await axios.get(`${BASE_URL}/jobcards/`, {
        params: { page: pageIndex, limit: pageSize, searchTerm, completed: true },
      });
      setJobCards(response.data?.data?.data);

      // Show success toast
      toast.push(
        <Notification title="Success" type="success">
          Job card marked as returned successfully.
        </Notification>
      );

      // Close the drawer
      closeStatusDrawer();
    } catch (error) {
      console.error('Error marking job card as returned:', error);
    }
  };

  const handleBillJobCard = async () => {
    if (!selectedBillJobCardId || !invoiceNumber) {
      toast.push(
        <Notification title="Error" type="danger">
          Invoice number is required.
        </Notification>
      );
      return;
    }
  
    try {
      await axios.put(
        `${BASE_URL}/jobcards/bill?id=${selectedBillJobCardId}&invoiceNumber=${invoiceNumber}`
      );
  
      // Refresh job cards
      const response = await axios.get(`${BASE_URL}/jobcards/`, {
        params: { page: pageIndex, limit: pageSize, searchTerm, completed: true },
      });
      setJobCards(response.data?.data?.data);
  
      // Show success toast
      toast.push(
        <Notification title="Success" type="success">
          Job card billed successfully.
        </Notification>
      );
  
      // Close the drawer
      closeBillDrawer();
    } catch (error) {
      console.error('Error billing job card:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to bill job card. Please try again.
        </Notification>
      );
    }
  };
  const columns: ColumnDef<JobCard>[] = useMemo(
    () => [
      {
        header: 'Customer Name',
        accessorKey: 'customerName',
        cell: (props) => (
          <span className="capitalize">{props.row.original.customerName}</span>
        ),
      },
      {
        header: 'Phone',
        accessorKey: 'phoneNumber',
      },
      {
        header: 'Date',
        accessorKey: 'InDate',
        cell: (props) => (
          <span>{new Date(props.row.original.InDate).toLocaleDateString()}</span>
        ),
      },
      {
        header: 'Jobcard No.',
        accessorKey: 'jobCardNumber',
      },
      {
        header: 'Worker',
        accessorKey: 'worker',
        cell: (props) => {
          const worker = props.row.original.worker;
          return worker ? (
            <div className="flex justify-center">
              <img
                src={worker.workerImage}
                alt={worker.workerName}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <span>-</span>
            </div>
          );
        },
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: (props) => (
          <div className="flex justify-end text-lg gap-2">
            <span
              className="cursor-pointer p-2 hover:text-green-500"
              onClick={() => navigate(`/app/jobcards/jobcard/${props.row.original._id}`)}
            >
              <HiOutlineEye />
            </span>
            <Button
              size="xs"
              icon={<HiRefresh />}
              onClick={() => openStatusDrawer(props.row.original._id)}
            >
              Change
            </Button>
            <Button
              size="xs"
              icon={<HiReceiptTax />}
              onClick={() => openBillDrawer(props.row.original._id)}
            >
              Bill
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const onPaginationChange = (page: number) => setPageIndex(page);
  const onSelectChange = (size: number) => {
    setPageSize(size);
    setPageIndex(1);
  };

  return (
    <>
      <DataTable
        ref={tableRef}
        columns={columns}
        data={jobCards}
        loading={loading}
        pagingData={{ total, pageIndex, pageSize }}
        onPaginationChange={onPaginationChange}
        onSelectChange={onSelectChange}
      />

      {/* Change Status Drawer */}
      <Drawer
        title="Change Status"
        isOpen={isStatusDrawerOpen}
        onClose={closeStatusDrawer}
        onRequestClose={closeStatusDrawer}
      >
        <div className="space-y-4">
          <Button
            block
            onClick={handlePendingJobCard}
          >
            Pending
          </Button>
          <Button
            block
            onClick={handleReturnJobCard}
          >
            Return
          </Button>
        </div>
      </Drawer>

      {/* Bill Drawer */}
      <Drawer
        title="Bill Job Card"
        isOpen={isBillDrawerOpen}
        onClose={closeBillDrawer}
        onRequestClose={closeBillDrawer}
      >
        <div className="space-y-4">
          <Input
            placeholder="Enter Invoice Number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
          <Button
            block
            onClick={handleBillJobCard}
          >
            Submit
          </Button>
        </div>
      </Drawer>
    </>
  );
};

export default CompletedTable;