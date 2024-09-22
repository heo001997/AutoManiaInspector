import {connect} from 'react-redux';

import * as SessionActions from '../actions/Session';
import Session from '../components/Session/Session.jsx';
import {withTranslation} from '../i18next';

// This function takes the entire Redux state and returns an object. 
// In this case, it's returning state.session, which means all properties 
// of the session slice of the state will be passed as props to the connected component.
function mapStateToProps(state) {
  return state.session;
}

export default withTranslation(Session, connect(mapStateToProps, SessionActions));
