"use client";

import React, { useEffect, useState } from "react";
import {
  MapPin,
  Building2,
  Plus,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import {
  adminGetOffices,
  adminCreateOffice,
  adminUpdateOffice,
  adminDeleteOffice,
  adminGetCompanies,
} from "@/lib/admin-api";
import { OfficeResponse, ApiCompany } from "@/types/api";

// Greater Bengaluru Bounding Box constants
const BENGALURU_BOUNDS = {
  minLat: 12.7,
  maxLat: 13.25,
  minLng: 77.35,
  maxLng: 77.85,
};

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<(OfficeResponse & { company_name?: string })[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [localityFilter, setLocalityFilter] = useState<string>("");

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<OfficeResponse | null>(null);
  const [formCompanyId, setFormCompanyId] = useState<number | "">("");
  const [formLocality, setFormLocality] = useState("Koramangala");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("Bengaluru");
  const [formState, setFormState] = useState("Karnataka");
  const [formPostalCode, setFormPostalCode] = useState("560034");
  const [formLatitude, setFormLatitude] = useState<number | "">(12.9352);
  const [formLongitude, setFormLongitude] = useState<number | "">(77.6245);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<OfficeResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOffices = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await adminGetOffices({
        page,
        limit,
        company_id: companyFilter ? Number(companyFilter) : undefined,
        locality: localityFilter.trim() || undefined,
      });
      setOffices(res.items);
      setTotal(res.total);
      setTotalPages(Math.ceil(res.total / limit) || 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load offices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminGetCompanies({ limit: 100 })
      .then((c) => setCompanies(c.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOffices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, companyFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOffices();
  };

  const openCreateModal = () => {
    setEditingOffice(null);
    setFormCompanyId(companies[0]?.id || "");
    setFormLocality("Koramangala");
    setFormAddress("");
    setFormCity("Bengaluru");
    setFormState("Karnataka");
    setFormPostalCode("560034");
    setFormLatitude(12.9352);
    setFormLongitude(77.6245);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (office: OfficeResponse) => {
    setEditingOffice(office);
    setFormCompanyId(office.company_id);
    setFormLocality(office.locality || "");
    setFormAddress(office.address || "");
    setFormCity(office.city || "Bengaluru");
    setFormState(office.state || "Karnataka");
    setFormPostalCode(office.postal_code || "");
    setFormLatitude(office.latitude ?? "");
    setFormLongitude(office.longitude ?? "");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompanyId) {
      setModalError("Please select a company.");
      return;
    }

    const lat = Number(formLatitude);
    const lng = Number(formLongitude);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < BENGALURU_BOUNDS.minLat ||
      lat > BENGALURU_BOUNDS.maxLat ||
      lng < BENGALURU_BOUNDS.minLng ||
      lng > BENGALURU_BOUNDS.maxLng
    ) {
      setModalError(
        `Coordinates outside Greater Bengaluru bounds (Lat: ${BENGALURU_BOUNDS.minLat} - ${BENGALURU_BOUNDS.maxLat}, Lng: ${BENGALURU_BOUNDS.minLng} - ${BENGALURU_BOUNDS.maxLng}).`
      );
      return;
    }

    setModalSaving(true);
    setModalError(null);

    const payload = {
      company_id: Number(formCompanyId),
      locality: formLocality.trim() || undefined,
      address: formAddress.trim() || undefined,
      city: formCity.trim() || "Bengaluru",
      state: formState.trim() || "Karnataka",
      postal_code: formPostalCode.trim() || undefined,
      latitude: lat,
      longitude: lng,
    };

    try {
      if (editingOffice) {
        await adminUpdateOffice(editingOffice.id, payload);
      } else {
        await adminCreateOffice(payload);
      }
      setIsModalOpen(false);
      fetchOffices();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to save office");
    } finally {
      setModalSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setActionError(null);
      await adminDeleteOffice(deleteTarget.id, forceDelete);
      setDeleteTarget(null);
      setForceDelete(false);
      fetchOffices();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete office");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-emerald-400" />
            Office Locations Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain verified startup physical coordinates, hubs, and postal details across Bengaluru.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition shadow-md shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Add Office Location</span>
        </button>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Search by locality (e.g. Indiranagar, Bellandur)..."
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition border border-slate-700"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
            {(companyFilter || localityFilter) && (
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter("");
                  setLocalityFilter("");
                  setPage(1);
                }}
                className="px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Locality & Address</th>
                <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                <th className="py-3 px-4">Postal Code</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      <span>Loading office locations...</span>
                    </div>
                  </td>
                </tr>
              ) : offices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No offices match the selected criteria.
                  </td>
                </tr>
              ) : (
                offices.map((office) => {
                  const compName =
                    office.company_name ||
                    companies.find((c) => c.id === office.company_id)?.name ||
                    `Company #${office.company_id}`;
                  return (
                    <tr key={office.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-500" />
                          <span>{compName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-400">
                          {office.locality || "Bengaluru"}
                        </span>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {office.address || "Address not specified"}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        {office.latitude != null && office.longitude != null ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${office.latitude}&mlon=${office.longitude}#map=16/${office.latitude}/${office.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition"
                            title="View on OpenStreetMap"
                          >
                            <span>
                              {office.latitude.toFixed(4)}, {office.longitude.toFixed(4)}
                            </span>
                            <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Not set</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {office.postal_code || "560xxx"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(office)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                            title="Edit Office"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(office);
                              setForceDelete(false);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Office"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-white">
              {offices.length ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold text-white">{total}</span> offices
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Office Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-400" />
                {editingOffice ? "Edit Office Location" : "Add Bengaluru Office"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Company <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={formCompanyId}
                    required
                    onChange={(e) => setFormCompanyId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="" disabled>Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Locality / Tech Hub <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Koramangala, Indiranagar"
                    value={formLocality}
                    onChange={(e) => setFormLocality(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Postal Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 560034"
                    value={formPostalCode}
                    onChange={(e) => setFormPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Full Address</label>
                  <input
                    type="text"
                    placeholder="Building, street, tech park..."
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Latitude <span className="text-slate-500">(12.70 - 13.25)</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="12.9352"
                    value={formLatitude}
                    onChange={(e) => setFormLatitude(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Longitude <span className="text-slate-500">(77.35 - 77.85)</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="77.6245"
                    value={formLongitude}
                    onChange={(e) => setFormLongitude(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition disabled:opacity-50"
                >
                  {modalSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingOffice ? "Update Office" : "Add Office"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Delete Office</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to delete this office in{" "}
                  <span className="text-white font-semibold">
                    {deleteTarget.locality || "Bengaluru"}
                  </span>
                  ?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500"
                    />
                    <span>
                      Force delete: remove office association even if active jobs are currently assigned to it.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setForceDelete(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Office</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
