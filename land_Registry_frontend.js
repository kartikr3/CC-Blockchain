// App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import LandRegistry from './artifacts/contracts/LandRegistry.sol/LandRegistry.json';

// The contract address will need to be updated after deployment to Sepolia
const contractAddress = '0x2E4dF7e7a62397F9E95E705B94ebF1c14dBc6f9B';

function App() {
  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lands, setLands] = useState([]);
  const [landDetails, setLandDetails] = useState(null);
  const [ownershipHistory, setOwnershipHistory] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [registerFormData, setRegisterFormData] = useState({
    landId: '',
    owner: '',
    size: '',
    location: '',
    landTitleNumber: ''
  });
  const [transferFormData, setTransferFormData] = useState({
    landId: '',
    newOwner: ''
  });

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, LandRegistry.abi, signer);
        
        const admin = await contract.admin();
        const isAdmin = accounts[0].toLowerCase() === admin.toLowerCase();
        
        setProvider(provider);
        setSigner(signer);
        setContract(contract);
        setAccount(accounts[0]);
        setIsAdmin(isAdmin);
        setIsConnected(true);

        // Load user's lands
        if (isAdmin) {
          // If admin, we might want to load all lands, but that's not straightforward
          // Without events/indexing. We'll just show a message to search for lands
        } else {
          const userLands = await contract.getOwnerLands(accounts[0]);
          setLands(userLands.map(id => parseInt(id)));
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          window.location.reload();
        });

      } else {
        setError('MetaMask not installed. Please install MetaMask to use this application.');
      }
    } catch (error) {
      setError(`Error connecting wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Register new land (admin only)
  const registerLand = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (!isAdmin) {
        setError('Only admin can register land');
        return;
      }

      const { landId, owner, size, location, landTitleNumber } = registerFormData;
      
      const tx = await contract.registerLand(
        landId,
        owner,
        size,
        location,
        landTitleNumber
      );
      
      await tx.wait();
      
      setRegisterFormData({
        landId: '',
        owner: '',
        size: '',
        location: '',
        landTitleNumber: ''
      });
      
      alert('Land registered successfully!');
    } catch (error) {
      setError(`Error registering land: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify land (admin only)
  const verifyLand = async (landId) => {
    try {
      setLoading(true);
      setError('');

      if (!isAdmin) {
        setError('Only admin can verify land');
        return;
      }

      const tx = await contract.verifyLand(landId);
      await tx.wait();
      
      // Refresh land details
      await fetchLandDetails(landId);
      
      alert('Land verified successfully!');
    } catch (error) {
      setError(`Error verifying land: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Transfer ownership
  const transferOwnership = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const { landId, newOwner } = transferFormData;
      
      const tx = await contract.transferOwnership(landId, newOwner);
      await tx.wait();
      
      setTransferFormData({
        landId: '',
        newOwner: ''
      });
      
      // Refresh lands owned by user
      const userLands = await contract.getOwnerLands(account);
      setLands(userLands.map(id => parseInt(id)));
      
      alert('Ownership transferred successfully!');
    } catch (error) {
      setError(`Error transferring ownership: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch land details
  const fetchLandDetails = async (landId) => {
    try {
      setLoading(true);
      setError('');
      setLandDetails(null);
      setOwnershipHistory([]);

      const details = await contract.getLandDetails(landId);
      
      setLandDetails({
        landId: parseInt(details.landId),
        currentOwner: details.currentOwner,
        size: parseInt(details.size),
        location: details.location,
        landTitleNumber: details.landTitleNumber,
        isVerified: details.isVerified
      });

      const history = await contract.getOwnershipHistory(landId);
      
      setOwnershipHistory(history.map(record => ({
        owner: record.owner,
        timestamp: new Date(record.timestamp * 1000).toLocaleString(),
        verified: record.verified
      })));
      
    } catch (error) {
      setError(`Error fetching land details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Search
  const handleSearch = (e) => {
    e.preventDefault();
    if (selectedLandId) {
      fetchLandDetails(selectedLandId);
    }
  };

  // Handle form input changes
  const handleRegisterFormChange = (e) => {
    const { name, value } = e.target;
    setRegisterFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleTransferFormChange = (e) => {
    const { name, value } = e.target;
    setTransferFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  return (
    <div className="app-container">
      <header>
        <h1>Blockchain Land Registry System</h1>
        {!isConnected ? (
          <button onClick={connectWallet} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="account-info">
            <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
            <p>{isAdmin ? 'Admin Account' : 'User Account'}</p>
          </div>
        )}
      </header>

      {error && <div className="error-message">{error}</div>}

      {isConnected && (
        <div className="dashboard">
          {/* Land Search Section */}
          <section className="section">
            <h2>Search Land Records</h2>
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label>Land ID:</label>
                <input
                  type="number"
                  value={selectedLandId}
                  onChange={(e) => setSelectedLandId(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </section>

          {/* Land Details Section */}
          {landDetails && (
            <section className="section">
              <h2>Land Details</h2>
              <div className="details-container">
                <p><strong>Land ID:</strong> {landDetails.landId}</p>
                <p><strong>Current Owner:</strong> {landDetails.currentOwner}</p>
                <p><strong>Size:</strong> {landDetails.size} sq. ft.</p>
                <p><strong>Location:</strong> {landDetails.location}</p>
                <p><strong>Title Number:</strong> {landDetails.landTitleNumber}</p>
                <p><strong>Verification Status:</strong> {landDetails.isVerified ? 'Verified' : 'Not Verified'}</p>
                
                {isAdmin && !landDetails.isVerified && (
                  <button 
                    onClick={() => verifyLand(landDetails.landId)} 
                    disabled={loading} 
                    className="action-button verify-button"
                  >
                    {loading ? 'Verifying...' : 'Verify Land'}
                  </button>
                )}
              </div>

              <h3>Ownership History</h3>
              {ownershipHistory.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Timestamp</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownershipHistory.map((record, index) => (
                      <tr key={index}>
                        <td>{record.owner}</td>
                        <td>{record.timestamp}</td>
                        <td>{record.verified ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No ownership history available</p>
              )}
            </section>
          )}

          {/* Admin Section */}
          {isAdmin && (
            <section className="section admin-section">
              <h2>Admin Panel: Register Land</h2>
              <form onSubmit={registerLand}>
                <div className="form-group">
                  <label>Land ID:</label>
                  <input
                    type="number"
                    name="landId"
                    value={registerFormData.landId}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Owner Address:</label>
                  <input
                    type="text"
                    name="owner"
                    value={registerFormData.owner}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Size (sq. ft.):</label>
                  <input
                    type="number"
                    name="size"
                    value={registerFormData.size}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location (coordinates):</label>
                  <input
                    type="text"
                    name="location"
                    value={registerFormData.location}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Land Title Number:</label>
                  <input
                    type="text"
                    name="landTitleNumber"
                    value={registerFormData.landTitleNumber}
                    onChange={handleRegisterFormChange}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Registering...' : 'Register Land'}
                </button>
              </form>
            </section>
          )}

          {/* User Lands Section */}
          {!isAdmin && lands.length > 0 && (
            <section className="section">
              <h2>Your Lands</h2>
              <div className="lands-grid">
                {lands.map(landId => (
                  <div key={landId} className="land-card" onClick={() => fetchLandDetails(landId)}>
                    <h3>Land ID: {landId}</h3>
                    <p>Click to view details</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Transfer Ownership Section */}
          {!isAdmin && (
            <section className="section">
              <h2>Transfer Land Ownership</h2>
              <form onSubmit={transferOwnership}>
                <div className="form-group">
                  <label>Land ID:</label>
                  <input
                    type="number"
                    name="landId"
                    value={transferFormData.landId}
                    onChange={handleTransferFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Owner Address:</label>
                  <input
                    type="text"
                    name="newOwner"
                    value={transferFormData.newOwner}
                    onChange={handleTransferFormChange}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Transferring...' : 'Transfer Ownership'}
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
