import React, { useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";
import CustomSnackbar from "../../Components/CustomSnackbar/CustomSnackbar";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import OrderForm from "../../Components/OrderForm/OrderForm";

// Fetch maps
const fetchMaps = async () => {
  const { data } = await axios.get("http://localhost:5000/api/maps");
  return data;
};

// Fetch orders
const fetchOrders = async () => {
  const { data } = await axios.get("http://localhost:5000/api/orders");
  return data.orders; // Extract orders array
};

const Orders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch maps
  const {
    data: maps,
    isLoading: isLoadingMaps,
    error: errorMaps,
  } = useQuery({
    queryKey: ["maps"],
    queryFn: fetchMaps,
  });

  // Fetch orders
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: errorOrders,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    initialData: [], // Ensure initialData is an empty array
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      selectedMap: "",
      startingPoint: "",
      destinationPoint: "",
      contents: "",
    },
    mode: "onTouched",
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const onSubmit = async (data) => {
    const { selectedMap, startingPoint, destinationPoint, contents } = data;

    if (!selectedMap || !startingPoint || !destinationPoint || !contents) {
      setSnackbarSeverity("error");
      setSnackbarMessage("Please fill out all fields.");
      setSnackbarOpen(true);
      return;
    }

    const payload = {
      contents,
      map: selectedMap,
      origin: startingPoint,
      destination: destinationPoint,
    };

    try {
      const response = await axios.post(
        "http://localhost:5000/api/orders/create",
        payload
      );

      console.log(response);

      setSnackbarSeverity("success");
      setSnackbarMessage("Order created successfully!");

      queryClient.invalidateQueries(["orders"]);
    } catch (error) {
      console.log(error);
      setSnackbarSeverity("error");
      setSnackbarMessage("Error creating order.");
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleClose = () => {
    setSnackbarOpen(false);
  };

  if (isLoadingMaps || isLoadingOrders) return <span>Loading...</span>;
  if (errorMaps) return <span>Error fetching maps.</span>;
  if (errorOrders) return <span>Error fetching orders.</span>;

  // Log the orders to check its format
  console.log("Fetched Orders:", orders);

  const sortedOrders = orders
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const sortedMaps = [...maps].sort(
    (a, b) => a.creation_time - b.creation_time
  );

  return (
    <Box sx={{ padding: 2 }}>
      <OrderForm
        control={control}
        handleSubmit={handleSubmit}
        errors={errors}
        setValue={setValue}
        onSubmit={onSubmit}
        maps={sortedMaps}
        watch={watch}
      />

      <CustomSnackbar
        open={snackbarOpen}
        onClose={handleClose}
        message={snackbarMessage}
        severity={snackbarSeverity}
      />

      <Box sx={{ marginTop: 4 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Contents</TableCell>
                <TableCell>Map ID</TableCell>
                <TableCell>Starting Point</TableCell>
                <TableCell>Destination Point</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(sortedOrders) && sortedOrders.length > 0 ? (
                sortedOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>{order._id}</TableCell>
                    <TableCell>{order.contents}</TableCell>
                    <TableCell>{order.map}</TableCell>
                    <TableCell>{order.origin}</TableCell>
                    <TableCell>{order.destination}</TableCell>
                    <TableCell>
                      <Tooltip title="Redirects to control-panel page with pre-selected parameters">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            navigate(
                              `/control-panel?selectedMap=${order.map}&startingPoint=${order.origin}&destinationPoint=${order.destination}`
                            )
                          }
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        color="secondary"
                        onClick={() =>
                          // Add logic to delete the order
                          console.log("Delete Order:", order._id)
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>No orders available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default Orders;
